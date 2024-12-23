import React from 'react';

const TestComponent = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-sm w-full">
        <h1 className="text-2xl font-bold text-blue-600 mb-4">
          Tailwind Test
        </h1>
        <p className="text-gray-600 mb-4">
          If you can see this card with styles, Tailwind is working!
        </p>
        <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors">
          Test Button
        </button>
      </div>
    </div>
  );
};

export default TestComponent;