'use client';

interface StreamingOutputProps {
    text: string;
    isComplete: boolean;
}

export default function StreamingOutput({ text, isComplete }: StreamingOutputProps) {
    return (
        <div className="streaming-output glass-card">
            <div className="streaming-header">
                <div className="streaming-indicator">
                    {!isComplete && <span className="pulse"></span>}
                    <span>{isComplete ? '✅ Complete' : '🔄 Processing...'}</span>
                </div>
            </div>
            <div className="streaming-content">
                <pre>{text}</pre>
                {!isComplete && <span className="cursor">▋</span>}
            </div>
        </div>
    );
}
