import { useState } from "react";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold text-blue-600">Hello Tailwind 🚀</h1>

      <div className="bg-white shadow-lg rounded-xl p-6 w-80 text-center">
        <p className="text-gray-700 mb-4">Count value:</p>

        <p className="text-3xl font-semibold text-green-600">{count}</p>

        <button
          onClick={() => setCount(count + 1)}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:scale-95 transition"
        >
          Increase
        </button>
      </div>
    </div>
  );
}

export default App;
