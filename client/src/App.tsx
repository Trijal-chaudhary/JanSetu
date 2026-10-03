import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "../src/components/Home/Home.tsx";
import Report from "./components/Report/Report.tsx";
import ManualReport from "./components/ManualReport/ManualReport.tsx";
const App = () => {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/report" element={<Report />} />
          <Route path="/report_manual" element={<ManualReport />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

export default App;
