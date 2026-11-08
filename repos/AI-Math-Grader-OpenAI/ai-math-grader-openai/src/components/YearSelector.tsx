'use client';

interface YearSelectorProps {
    years: string[];
    selectedYear: string;
    onSelect: (year: string) => void;
}

export default function YearSelector({ years, selectedYear, onSelect }: YearSelectorProps) {
    return (
        <div className="year-selector">
            <div className="year-grid">
                {years.map((year) => (
                    <button
                        key={year}
                        onClick={() => onSelect(year)}
                        className={`year-button ${selectedYear === year ? 'selected' : ''}`}
                    >
                        {year}
                    </button>
                ))}
            </div>
        </div>
    );
}
