import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const DonationPortal = () => {
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [txHash, setTxHash] = useState('');
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [contractStats, setContractStats] = useState({
    totalDonations: '0',
    userDonations: '0',
    donorTier: 'NONE',
    minimumDonation: '0',
    donorCount: 0
  });
  const [donationAmount, setDonationAmount] = useState('0.01');
  const [connectionStage, setConnectionStage] = useState('');
  const [isPending, setIsPending] = useState(false);


  const CONTRACT_ABI = [
    "function minimumDonation() public view returns (uint256)",
    "function donate() public payable",
    "function totalDonations() public view returns (uint256)",
    "function donorTotalContributions(address) public view returns (uint256)",
    "function getDonorTier(address) public view returns (string)",
    "function getDonorCount() public view returns (uint256)",
    "event DonationReceived(address indexed donor, uint256 amount, uint256 timestamp)",
    "event TierUpgrade(address indexed donor, uint256 newTier)"
  ];

  const getTierColor = (tier) => {
    switch (tier) {
      case 'GOLD': return 'bg-yellow-50 border-yellow-200 text-yellow-600';
      case 'SILVER': return 'bg-gray-50 border-gray-200 text-gray-600';
      case 'BRONZE': return 'bg-orange-50 border-orange-200 text-orange-600';
      default: return 'bg-blue-50 border-blue-200 text-blue-600';
    }
  };

  const connectWallet = async () => {
    if (isPending) {
      console.warn("Wallet connection already in progress. Please wait.");
      return;
    }
  
    try {
      setIsPending(true);
      setIsLoading(true);
      setError(null);
      setConnectionStage('checking');
  
      if (!window.ethereum) {
        throw new Error('MetaMask not detected. Please install MetaMask to use this dApp.');
      }
  
      setConnectionStage('requesting');
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
  
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from MetaMask.');
      }
  
      setConnectionStage('getting_chain');
      const chainId = await window.ethereum.request({
        method: 'eth_chainId',
      });
  
      setConnectionStage('creating_provider');
      const provider = new ethers.BrowserProvider(window.ethereum);
  
      const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
      if (!contractAddress) {
        throw new Error('Contract address not configured. Please check your environment variables.');
      }
  
      setConnectionStage('checking_contract');
      const code = await provider.getCode(contractAddress);
  
      if (code === '0x') {
        throw new Error(`Contract not found at ${contractAddress}. Please verify deployment and network.`);
      }
  
      setConnectionStage('success');
      setWalletConnected(true);
      setWalletAddress(accounts[0]);
      await updateDonationStats(accounts[0]);
    } catch (err) {
      if (err.code === -32002) {
        setError(
          'A wallet connection request is already pending. Please check your MetaMask popup or refresh the page to reset.'
        );
      } else {
        console.error('Wallet connection error:', {
          message: err.message,
          stage: connectionStage,
          error: err,
        });
        setError(err.message || 'Unknown error occurred');
      }
    } finally {
      setIsLoading(false);
      setIsPending(false);
    }
  };


  const updateDonationStats = async (address) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
      const contract = new ethers.Contract(
        contractAddress,
        CONTRACT_ABI,
        provider
      );

      // First fetch minimum donation to establish baseline
      const minDonation = await contract.minimumDonation();
      console.log('Minimum donation:', ethers.formatEther(minDonation));

      // Set initial donation amount to minimum
      const minDonationEth = Number(ethers.formatEther(minDonation));
      setDonationAmount(minDonationEth.toFixed(4));

      // Get remaining contract statistics
      const [total, userTotal, tier, donors] = await Promise.all([
        contract.totalDonations(),
        contract.donorTotalContributions(address),
        contract.getDonorTier(address),
        contract.getDonorCount()
      ]);

      setContractStats({
        totalDonations: Number(ethers.formatEther(total)).toFixed(4),
        userDonations: Number(ethers.formatEther(userTotal)).toFixed(4),
        donorTier: tier,
        minimumDonation: minDonationEth.toFixed(4),
        donorCount: Number(donors)
      });

    } catch (err) {
      console.error('Error fetching donation stats:', err);
      const errorMessage = err.reason || err.message || 'Unknown error occurred';
      setError(errorMessage);
    }
  };

  const makeDonation = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setStatus('Initiating donation...');

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
      const contract = new ethers.Contract(
        contractAddress,
        CONTRACT_ABI,
        signer
      );

      // Verify donation amount meets minimum
      const minDonation = await contract.minimumDonation();
      const donationWei = ethers.parseEther(donationAmount);
      
      if (donationWei < minDonation) {
        throw new Error(`Donation must be at least ${ethers.formatEther(minDonation)} ETH`);
      }

      // Send donation
      const tx = await contract.donate({
        value: donationWei,
        gasLimit: 200000
      });
      
      setTxHash(tx.hash);
      setStatus(`Transaction submitted: ${tx.hash}`);

      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        setStatus('Transaction successful!');
        await updateDonationStats(walletAddress);

        // Parse events
        for (const log of receipt.logs) {
          try {
            const parsedLog = contract.interface.parseLog(log);
            if (parsedLog?.name === 'DonationReceived') {
              const [donor, amount, timestamp] = parsedLog.args;
              setStatus(prev => `${prev}\nDonation of ${ethers.formatEther(amount)} ETH received`);
            } else if (parsedLog?.name === 'TierUpgrade') {
              const [donor, newTier] = parsedLog.args;
              const tierNames = ['NONE', 'BRONZE', 'SILVER', 'GOLD'];
              setStatus(prev => `${prev}\nCongratulations! You've reached ${tierNames[Number(newTier)]} tier!`);
            }
          } catch (e) {
            console.log('Error parsing log:', e);
          }
        }
      } else {
        throw new Error('Transaction failed');
      }

    } catch (err) {
      console.error('Transaction error:', err);
      const errorMessage = err.reason || err.message || 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          updateDonationStats(accounts[0]);
        } else {
          setWalletConnected(false);
          setWalletAddress('');
        }
      });
    }
    
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => {});
      }
    };
  }, []);

  return (
    <div className="p-4 max-w-md mx-auto">
      {!walletConnected ? (
        <div className="space-y-4">
          <button
            onClick={connectWallet}
            disabled={isLoading}
            className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 disabled:bg-green-300 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Connecting...' : 'Connect Wallet'}
          </button>
  
          {/* Connection Stage Feedback */}
          {connectionStage && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-yellow-700 text-sm">
                Current Stage: {connectionStage}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 border border-gray-200 rounded">
            <p className="text-sm text-gray-600">Connected Wallet:</p>
            <p className="font-mono text-sm break-all">{walletAddress}</p>
          </div>
  
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-blue-600">Total Donations</p>
                  <p className="text-2xl font-bold">{contractStats.totalDonations} ETH</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-600">Total Donors</p>
                  <p className="text-lg font-bold">{contractStats.donorCount}</p>
                </div>
              </div>
            </div>
  
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-purple-50 border border-purple-200 rounded">
                <p className="text-sm text-purple-600">Your Total Donations</p>
                <p className="text-xl font-bold">{contractStats.userDonations} ETH</p>
              </div>
              <div className={`p-4 rounded border ${getTierColor(contractStats.donorTier)}`}>
                <p className="text-sm">Your Donor Tier</p>
                <p className="text-xl font-bold">{contractStats.donorTier}</p>
              </div>
            </div>
          </div>
  
          <div className="space-y-2">
            <div className="p-4 bg-gray-50 border border-gray-200 rounded">
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="donationAmount" className="text-sm text-gray-600">
                  Donation Amount (ETH)
                </label>
                <span className="text-sm font-medium">{donationAmount} ETH</span>
              </div>
              <input
                id="donationAmount"
                type="range"
                min={contractStats.minimumDonation}
                max="1"
                step="0.01"
                value={donationAmount}
                onChange={(e) => setDonationAmount(e.target.value)}
                className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{contractStats.minimumDonation} ETH</span>
                <span>1 ETH</span>
              </div>
            </div>
  
            <button
              onClick={makeDonation}
              disabled={isLoading || Number(donationAmount) < Number(contractStats.minimumDonation)}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Processing...' : `Donate ${donationAmount} ETH`}
            </button>
          </div>
        </div>
      )}
  
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}
  
      {status && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
          <pre className="whitespace-pre-line text-sm">
            {status}
            {txHash && (
              <div className="mt-2 break-all">
                Transaction Hash: {txHash}
              </div>
            )}
          </pre>
        </div>
      )}
    </div>
  );  
};

export default DonationPortal;