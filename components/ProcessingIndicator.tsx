
import React, { useState, useEffect } from 'react';

const processingSteps = [
    "Warming up the AI engine...",
    "Scanning the floor plan...",
    "Identifying furniture and boxes...",
    "Calculating volume requirements...",
    "Estimating your truck size...",
    "Generating your detailed inventory...",
    "Finalizing your moving plan..."
];

const ProcessingIndicator: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentStep(prevStep => (prevStep + 1) % processingSteps.length);
        }, 1800);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="text-center p-8 bg-gray-900/50 border border-gray-700/50 rounded-lg max-w-lg w-full">
            <div className="flex justify-center items-center mb-6">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-400"></div>
            </div>
            <h3 className="text-2xl font-bold text-gray-100 mb-2">Analyzing Your Space</h3>
            <p className="text-gray-400 transition-opacity duration-500 ease-in-out">
                {processingSteps[currentStep]}
            </p>
        </div>
    );
};

export default ProcessingIndicator;
