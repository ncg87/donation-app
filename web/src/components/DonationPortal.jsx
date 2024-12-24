import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Wallet, RefreshCcw, DollarSign, Star, Users, Activity } from 'lucide-react';

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
  const [isOwner, setIsOwner] = useState(false);
  const [contractBalance, setContractBalance] = useState("0");
  const [withdrawalAmount, setWithdrawalAmount] = useState("0");
  const [totalWithdrawn, setTotalWithdrawn] = useState("0");
  const [donorCount, setDonorCount] = useState(0);



  const CONTRACT_ABI = [
    "function withdrawFunds(uint256 amount) public",
    "function minimumDonation() public view returns (uint256)",
    "function getContractBalance() public view returns (uint256)",
    "function donate() public payable",
    "function totalDonations() public view returns (uint256)",
    "function donorTotalContributions(address) public view returns (uint256)",
    "function getDonorTier(address) public view returns (string)",
    "function getDonorCount() public view returns (uint256)",
    "function owner() public view returns (address)",
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
    console.log("Connecting Wallet");
    try {
      console.log("Contract Address:", import.meta.env.VITE_CONTRACT_ADDRESS);
      setIsLoading(true);
      setIsPending(true);
      setError(null);
      setConnectionStage("checking");
  
      // Check if MetaMask is available
      if (!window.ethereum) {
        throw new Error("MetaMask not detected. Please install MetaMask.");
      }
  
      setConnectionStage("requesting");
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
  
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts returned from MetaMask.");
      }
      console.log("Connected Wallet Address:", accounts[0]);
  
      setConnectionStage("creating_provider");
      const provider = new ethers.BrowserProvider(window.ethereum);
  
      const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
      if (!contractAddress) {
        throw new Error("Contract address not configured. Check .env file.");
      }
  
      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, provider);
  
      // Fetch the owner address
      const ownerAddress = await contract.owner;
      if (!ownerAddress) {
        throw new Error("Owner address is undefined. Check the contract deployment.");
      }
      console.log("Owner Address:", ownerAddress);
  
      // Compare connected wallet with owner
      const isOwnerAddress = ownerAddress === accounts[0];
      console.log("Is Connected Wallet the Owner?", isOwnerAddress);
  
      // Update states
      setWalletConnected(true);
      setWalletAddress(accounts[0]);
      setIsOwner(isOwnerAddress);
      
      
      // Fetch additional data for the owner
      if (isOwnerAddress) {
        const balance = await contract.getContractBalance()
        const donors = await contract.getDonorCount();
        setContractBalance(ethers.formatEther(balance));
        setDonorCount(Number(donors));
      }
  
      setConnectionStage("success");
    } catch (err) {
      console.error("Wallet Connection Error:", err.message);
      setError(err.message || "Unknown error occurred");
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

      console.log("Sending Donation:", donationAmount);
      console.log("Submitting donation:", donationWei);
      // Send donation
      const tx = await contract.donate({
        value: donationWei,
      });
      console.log("Transaction Hash:", tx.hash);
      
      setTxHash(tx.hash);
      console.log("Transaction submitted:", tx);
      setStatus(`Transaction submitted: ${tx.hash}`);

      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        console.log("Donation successful:", receipt);
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
  

  const fetchOwnerData = async () => {
    try {
      const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(
        import.meta.env.VITE_CONTRACT_ADDRESS,
        CONTRACT_ABI,
        provider
      );
      

      // Fetch contract balance
      const balance = await contract.getContractBalance(); // Ensure ABI contains getContractBalance()
      const formattedBalance = ethers.formatEther(balance);
      console.log("Contract Balance (ETH):", formattedBalance);

      // Fetch total donations
      const totalDonations = await contract.totalDonations(); // Ensure ABI contains totalDonations()
      const formattedTotalDonations = ethers.formatEther(totalDonations);
      console.log("Total Donations (ETH):", formattedTotalDonations);

      // Calculate total withdrawn
      const totalWithdrawn = (Number(formattedTotalDonations) - Number(formattedBalance)).toFixed(4);
      console.log("Total Withdrawn (ETH):", totalWithdrawn);

      // Update states
      setContractBalance(formattedBalance);
      setTotalWithdrawn(totalWithdrawn);
      console.log("Contract Address:", contractAddress);
      console.log("Owner Address:", await contract.owner());
      console.log("Total Donations:", ethers.formatEther(await contract.totalDonations()));
      console.log("Minimum Donation:", ethers.formatEther(await contract.minimumDonation()));
  
      // Check if the connected wallet is the owner
      const contractOwner = await contract.owner();

      const isOwnerAddress = contractOwner.toLowerCase() === walletAddress.toLowerCase();

      setIsOwner(isOwnerAddress);
  
      if (isOwnerAddress) {
        // Fetch contract balance and donor count
        const balance = await contract.getContractBalance();
        const donors = await contract.getDonorCount();
        const formattedBalance = ethers.formatEther(balance);
        setContractBalance(formattedBalance);
        setDonorCount(Number(donors));
      }
    } catch (error) {
      console.error("Error fetching owner data:", error);
    }
  };
  
  useEffect(() => {
    if (walletConnected) {
      fetchOwnerData();
    }
    if (walletAddress && walletConnected) {
      updateDonationStats(walletAddress);
    }
  }, [walletConnected, walletAddress]);
  

  const withdrawFunds = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Get current balance and check if it is greater than 0
      const balance = await provider.getBalance(import.meta.env.VITE_CONTRACT_ADDRESS);
      console.log("Contract Balance (in wei):", balance.toString());
      if (balance === 0n) {
        throw new Error("No funds available in the contract");
      }

      // Get amount to withdraw and check if it is greater than 0
      const withdrawalWei = ethers.parseEther(withdrawalAmount);
      if (withdrawalWei > balance) {
        throw new Error("Not enough funds in the contract to withdraw the specified amount");
      }

      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        import.meta.env.VITE_CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer

      );
  
      const tx = await contract.withdrawFunds(withdrawalWei);
      const receipt = await tx.wait();
      console.log("Withdrawal receipt:", receipt);
  
      alert(`Successfully withdrew ${withdrawalAmount} ETH!`);
  
      // Update data after withdrawal
      fetchOwnerData();
      setTotalWithdrawn((prev) => (Number(prev) + Number(withdrawalAmount)).toFixed(4));
    } catch (error) {
      console.error("Withdrawal error:", error);
      alert("Failed to withdraw funds: " + (error.message || "Unknown error"));
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
<div className="p-6 max-w-lg mx-auto bg-white shadow-md rounded-lg">
  <h1 className="text-2xl font-bold text-center text-gray-800 mb-4">
    <Activity className="inline-block w-6 h-6 mr-2 text-blue-600" />
    Support the Cause
  </h1>

  {!walletConnected ? (
    <div className="space-y-6">
      <button
        onClick={connectWallet}
        disabled={isLoading || isPending}
        className="w-full bg-gradient-to-r from-green-400 to-green-600 text-white py-3 px-6 rounded-lg text-lg font-semibold shadow-md flex items-center justify-center hover:from-green-500 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Wallet className="w-5 h-5 mr-2" />
        {isLoading ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {connectionStage && (
        <div className="mt-2 p-4 bg-yellow-100 border border-yellow-300 rounded-md">
          <p className="text-yellow-700 text-sm font-medium text-center">
            <RefreshCcw className="inline-block w-5 h-5 mr-1" />
            Current Stage: {connectionStage}
          </p>
        </div>
      )}
    </div>
  ) : isOwner ? (
    <div className="space-y-4">
      <div className="bg-blue-100 p-6 rounded-lg shadow-lg flex justify-between items-center">
        <div>
          <p className="text-blue-600 font-medium flex items-center">
            <DollarSign className="w-5 h-5 mr-1" />
            Total Donations
          </p>
          <p className="text-3xl font-bold text-blue-900">{contractStats.totalDonations} ETH</p>
        </div>
        <div className="text-right">
          <p className="text-blue-600 font-medium flex items-center justify-end">
            <Users className="w-5 h-5 mr-1" />
            Total Donors
          </p>
          <p className="text-2xl font-bold text-blue-900">{contractStats.donorCount}</p>
        </div>
      </div>

      <div className="bg-purple-100 p-6 rounded-lg shadow-lg flex justify-between items-center">
        <div>
          <p className="text-purple-600 font-medium flex items-center">
            <DollarSign className="w-5 h-5 mr-1" />
            Total Withdrawn
          </p>
          <p className="text-3xl font-bold text-purple-900">{totalWithdrawn} ETH</p>
        </div>
        <div className="text-right">
          <p className="text-purple-600 font-medium flex items-center justify-end">
            <Wallet className="w-5 h-5 mr-1" />
            Contract Balance
          </p>
          <p className="text-2xl font-bold text-purple-900">{contractBalance} ETH</p>
        </div>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg shadow-inner mt-6">
        <label htmlFor="withdrawalAmount" className="block text-gray-600 font-medium mb-2 flex items-center">
          <DollarSign className="w-5 h-5 mr-1" />
          Withdrawal Amount (ETH)
        </label>
        <input
          type="range"
          id="withdrawalAmount"
          min="0"
          max={contractBalance}
          step="0.01"
          value={withdrawalAmount}
          onChange={(e) => setWithdrawalAmount(e.target.value)}
          className="w-full h-2 bg-red-300 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-sm text-gray-500 mt-1">
          <span>0 ETH</span>
          <span>{contractBalance} ETH</span>
        </div>
        <p className="text-sm text-gray-600 mb-4 mt-2">Selected: {withdrawalAmount} ETH</p>
        <button
          onClick={withdrawFunds}
          className="w-full bg-gradient-to-r from-red-500 to-red-700 text-white py-3 px-6 rounded-lg text-lg font-semibold shadow-md hover:from-red-600 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Withdraw Funds
        </button>
      </div>
    </div>
  ) : (
    <div className="space-y-6">
      <div className="bg-gray-100 p-4 rounded-lg shadow-inner flex items-center space-x-4">
        <Wallet className="w-6 h-6 text-gray-600" />
        <div>
          <p className="text-gray-600 text-sm">Connected Wallet:</p>
          <p className="font-mono text-sm text-gray-800">{walletAddress}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-blue-100 p-6 rounded-lg shadow-lg flex justify-between items-center">
          <div>
            <p className="text-blue-600 font-medium flex items-center">
              <DollarSign className="w-5 h-5 mr-1" />
              Total Donations
            </p>
            <p className="text-3xl font-bold text-blue-900">
              {contractStats.totalDonations} ETH
            </p>
          </div>
          <div className="text-right">
            <p className="text-blue-600 font-medium flex items-center justify-end">
              <Users className="w-5 h-5 mr-1" />
              Total Donors
            </p>
            <p className="text-2xl font-bold text-blue-900">
              {contractStats.donorCount}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-purple-100 p-4 rounded-lg shadow-inner flex items-center space-x-4">
            <DollarSign className="w-6 h-6 text-purple-600" />
            <div>
              <p className="text-purple-600 font-medium">Your Total Donations</p>
              <p className="text-2xl font-bold text-purple-900">
                {contractStats.userDonations} ETH
              </p>
            </div>
          </div>
          <div className={`p-4 rounded-lg shadow-inner flex items-center space-x-4 ${getTierColor(contractStats.donorTier)}`}>
            <Star className="w-6 h-6 text-yellow-600" />
            <div>
              <p className="text-sm font-medium">Your Donor Tier</p>
              <p className="text-xl font-bold">{contractStats.donorTier}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg shadow-inner">
        <label htmlFor="donationAmount" className="block text-gray-600 font-medium mb-2 flex items-center">
          <DollarSign className="w-5 h-5 mr-1" />
          Donation Amount (ETH)
        </label>
        <input
          id="donationAmount"
          type="range"
          min={contractStats.minimumDonation}
          max="1"
          step="0.01"
          value={donationAmount}
          onChange={(e) => setDonationAmount(e.target.value)}
          className="w-full h-2 bg-blue-300 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-sm text-gray-500 mt-1">
          <span>{contractStats.minimumDonation} ETH</span>
          <span>1 ETH</span>
        </div>
      </div>

      <button
        onClick={makeDonation}
        disabled={isLoading || Number(donationAmount) < Number(contractStats.minimumDonation)}
        className="w-full bg-gradient-to-r from-blue-500 to-blue-700 text-white py-3 px-6 rounded-lg text-lg font-semibold shadow-md flex items-center justify-center hover:from-blue-600 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <DollarSign className="w-5 h-5 mr-2" />
        {isLoading ? 'Processing...' : `Donate ${donationAmount} ETH`}
      </button>
    </div>
  )}

  {error && (
    <div className="mt-6 p-4 bg-red-100 border border-red-300 rounded-lg text-red-700">
      {error}
    </div>
  )}

  {status && (
    <div className="mt-6 p-4 bg-blue-100 border border-blue-300 rounded-lg">
      <pre className="whitespace-pre-line text-sm text-blue-900">
        {status}
        {txHash && (
          <div className="mt-2 break-all text-blue-600">
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