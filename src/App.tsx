import { BrowserRouter, Routes, Route } from "react-router-dom";

// Minimal test component
const TestPage = () => {
  return (
    <div className="min-h-screen bg-white p-8">
      <h1 className="text-2xl font-bold">Test Page</h1>
      <p>If you can see this, React is working correctly.</p>
    </div>
  );
};

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<TestPage />} />
      <Route path="*" element={<TestPage />} />
    </Routes>
  </BrowserRouter>
);

export default App;