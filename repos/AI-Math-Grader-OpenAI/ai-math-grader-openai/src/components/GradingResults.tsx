'use client';

import { GradingResult } from '@/types/grading';
import { useRef } from 'react';

interface GradingResultsProps {
    result: GradingResult;
    onReset: () => void;
}

export default function GradingResults({ result, onReset }: GradingResultsProps) {
    const resultsRef = useRef<HTMLDivElement>(null);

    const getScoreColor = (percentage: number) => {
        if (percentage >= 80) return 'score-excellent';
        if (percentage >= 60) return 'score-good';
        if (percentage >= 40) return 'score-fair';
        return 'score-needs-work';
    };

    const getScoreEmoji = (percentage: number) => {
        if (percentage >= 90) return '🌟';
        if (percentage >= 80) return '✨';
        if (percentage >= 70) return '👍';
        if (percentage >= 60) return '📈';
        if (percentage >= 50) return '💪';
        return '📚';
    };

    const exportToPDF = async () => {
        const { jsPDF } = await import('jspdf');

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 15;
        let y = margin;
        const lineHeight = 6;
        const sectionGap = 10;

        // Helper functions
        const addText = (text: string, x: number, fontSize: number = 10, style: 'normal' | 'bold' = 'normal') => {
            pdf.setFontSize(fontSize);
            pdf.setFont('helvetica', style);
            pdf.text(text, x, y);
            y += lineHeight;
        };

        const addWrappedText = (text: string, x: number, maxWidth: number, fontSize: number = 10) => {
            pdf.setFontSize(fontSize);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(0, 0, 0);
            const lines = pdf.splitTextToSize(text, maxWidth);
            lines.forEach((line: string) => {
                if (y > pageHeight - margin) {
                    pdf.addPage();
                    y = margin;
                    pdf.setFontSize(fontSize);
                    pdf.setFont('helvetica', 'normal');
                    pdf.setTextColor(0, 0, 0);
                }
                pdf.text(line, x, y);
                y += lineHeight - 1;
            });
        };

        const addSection = (title: string) => {
            if (y > pageHeight - 40) {
                pdf.addPage();
                y = margin;
            }
            y += sectionGap;
            const currentY = y;
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(0, 0, 0);
            pdf.text(title, margin, y);
            y += lineHeight + 2;
            // Underline
            pdf.setDrawColor(200, 200, 200);
            pdf.line(margin, y - 4, pageWidth - margin, y - 4);
        };

        const checkPageBreak = (neededSpace: number = 30) => {
            if (y > pageHeight - neededSpace) {
                pdf.addPage();
                y = margin;
            }
        };

        // Set default text color
        pdf.setTextColor(0, 0, 0);

        // === HEADER ===
        pdf.setFontSize(20);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Matematikprov - Bedömning', margin, y);
        y += 8;

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 100, 100);
        const year = result.exam_info?.year || result.exam_info?.detected_year || '';
        pdf.text(`${result.exam_info.exam_type} - År ${year}`, margin, y);
        y += 6;
        pdf.text(`Elev: Student`, margin, y);
        y += 6;
        pdf.text(`Datum: ${new Date().toLocaleDateString('sv-SE')}`, margin, y);
        y += sectionGap;

        // === SCORE BOX ===
        pdf.setTextColor(0, 0, 0);
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.5);
        pdf.rect(margin, y, pageWidth - 2 * margin, 25);

        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Resultat:', margin + 5, y + 10);

        pdf.setFontSize(24);
        pdf.text(`${result.total_score} / ${result.max_possible_score}`, margin + 40, y + 12);

        pdf.setFontSize(18);
        pdf.text(`(${result.percentage.toFixed(1)}%)`, margin + 80, y + 12);

        const grade = result.percentage >= 80 ? 'Utmärkt!' :
            result.percentage >= 60 ? 'Godkänt' :
                result.percentage >= 40 ? 'Behöver förbättras' : 'Underkänt';
        pdf.setFontSize(14);
        pdf.text(grade, pageWidth - margin - 40, y + 12);

        y += 30;

        // === OVERALL FEEDBACK ===
        addSection('Övergripande Bedömning');
        pdf.setTextColor(0, 0, 0);
        addWrappedText(result.overall_feedback, margin, pageWidth - 2 * margin);

        // === STRENGTHS ===
        addSection('Styrkor');
        pdf.setTextColor(0, 0, 0);
        result.strengths.forEach((strength) => {
            checkPageBreak();
            pdf.text(`• ${strength}`, margin + 3, y);
            y += lineHeight;
        });

        // === AREAS TO IMPROVE ===
        addSection('Förbättringsområden');
        pdf.setTextColor(0, 0, 0);
        result.areas_to_improve.forEach((area) => {
            checkPageBreak();
            pdf.text(`• ${area}`, margin + 3, y);
            y += lineHeight;
        });

        // === STUDY RECOMMENDATIONS ===
        if (result.study_recommendations && result.study_recommendations.length > 0) {
            addSection('Studierekommendationer');
            pdf.setTextColor(0, 0, 0);
            result.study_recommendations.forEach((rec) => {
                checkPageBreak();
                addWrappedText(`• ${rec}`, margin + 3, pageWidth - 2 * margin - 5);
            });
        }

        // === PER QUESTION RESULTS ===
        addSection('Detaljerade Resultat per Fråga');

        result.per_question.forEach((q) => {
            checkPageBreak(60);

            // Question header box
            pdf.setFillColor(240, 240, 240);
            pdf.rect(margin, y - 3, pageWidth - 2 * margin, 8, 'F');

            pdf.setTextColor(0, 0, 0);
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`Fråga ${q.question_number}`, margin + 3, y + 2);

            const scoreText = `${q.score} / ${q.max_score} poäng`;
            pdf.text(scoreText, pageWidth - margin - 30, y + 2);
            y += 10;

            // Question text
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Uppgift:', margin, y);
            y += lineHeight;
            pdf.setFont('helvetica', 'normal');
            addWrappedText(q.question_text, margin + 3, pageWidth - 2 * margin - 5);
            y += 2;

            // Student answer
            checkPageBreak(20);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Elevens svar:', margin, y);
            y += lineHeight;
            pdf.setFont('helvetica', 'normal');
            addWrappedText(q.student_answer || 'Ej identifierat', margin + 3, pageWidth - 2 * margin - 5);
            y += 2;

            // Correct answer
            checkPageBreak(20);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Rätt svar:', margin, y);
            y += lineHeight;
            pdf.setFont('helvetica', 'normal');
            addWrappedText(q.correct_answer, margin + 3, pageWidth - 2 * margin - 5);
            y += 2;

            // Feedback
            checkPageBreak(20);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Feedback:', margin, y);
            y += lineHeight;
            pdf.setFont('helvetica', 'normal');
            addWrappedText(q.feedback, margin + 3, pageWidth - 2 * margin - 5);

            y += sectionGap;
        });

        // === FOOTER ===
        const totalPages = pdf.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);
            pdf.setFontSize(8);
            pdf.setTextColor(150, 150, 150);
            pdf.setFont('helvetica', 'normal');
            pdf.text(
                `Sida ${i} av ${totalPages} | Genererad av AI Math Grader | Hvitfeldska Spetsutbildning`,
                pageWidth / 2,
                pageHeight - 5,
                { align: 'center' }
            );
        }

        try {
            const date = new Date().toISOString().split('T')[0];
            const safeYear = year ? String(year).replace(/[^a-zA-Z0-9]/g, '_') : 'Result';
            const filename = `Student_Matteprov_${safeYear}_${date}.pdf`;

            console.log('📄 Exporting PDF with new jsPDF save()...');
            pdf.save(filename);
            console.log('✅ PDF save() triggered');
        } catch (error) {
            console.error('❌ Error exporting PDF:', error);
            alert('Det gick inte att exportera PDF. Se konsolen för detaljer.');
        }
    };

    return (
        <div className="results-container">
            {/* Action buttons */}
            <div className="results-actions">
                <button onClick={onReset} className="back-button">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Grade Another Exam
                </button>

                <button onClick={exportToPDF} className="export-button">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="12" y1="18" x2="12" y2="12" />
                        <polyline points="9 15 12 12 15 15" />
                    </svg>
                    📄 JS Export
                </button>

                <button onClick={() => window.print()} className="print-button">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 6 2 18 2 18 9" />
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <rect x="6" y="14" width="12" height="8" />
                    </svg>
                    🖨️ Skriv ut / Spara som PDF
                </button>
            </div>

            {/* Screen display */}
            <div ref={resultsRef} className="printable-results">
                {/* Score Overview Card */}
                <div className="glass-card score-card">
                    <div className="score-header">
                        <div className="exam-info">
                            <span className="exam-badge">{result.exam_info.exam_type}</span>
                            <span className="exam-year">{result.exam_info?.year || result.exam_info?.detected_year}</span>
                        </div>
                        <h2>Exam Results - Student</h2>
                    </div>

                    <div className="score-display">
                        <div className={`score-circle ${getScoreColor(result.percentage)}`}>
                            <span className="score-emoji">{getScoreEmoji(result.percentage)}</span>
                            <span className="score-value">{result.total_score}</span>
                            <span className="score-max">/ {result.max_possible_score}</span>
                        </div>
                        <div className="score-percentage">
                            <span className="percentage-value">{result.percentage.toFixed(1)}%</span>
                            <div className="percentage-bar">
                                <div
                                    className={`percentage-fill ${getScoreColor(result.percentage)}`}
                                    style={{ width: `${result.percentage}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    <div className="overall-feedback">
                        <h3>📝 Övergripande Bedömning</h3>
                        <p>{result.overall_feedback}</p>
                    </div>

                    <div className="feedback-columns">
                        <div className="strengths">
                            <h4>💪 Styrkor</h4>
                            <ul>
                                {result.strengths.map((strength, i) => (
                                    <li key={i}>{strength}</li>
                                ))}
                            </ul>
                        </div>
                        <div className="improvements">
                            <h4>📈 Förbättringsområden</h4>
                            <ul>
                                {result.areas_to_improve.map((area, i) => (
                                    <li key={i}>{area}</li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {result.study_recommendations && result.study_recommendations.length > 0 && (
                        <div className="study-recommendations">
                            <h4>📚 Studierekommendationer</h4>
                            <ul>
                                {result.study_recommendations.map((rec, i) => (
                                    <li key={i}>{rec}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Per-Question Results */}
                <div className="questions-section">
                    <h2>📊 Detaljerade Resultat per Fråga</h2>
                    <div className="questions-grid">
                        {result.per_question.map((q) => (
                            <div key={q.question_number} className="question-card glass-card">
                                <div className="question-header">
                                    <span className="question-number">Fråga {q.question_number}</span>
                                    <span className={`question-score ${getScoreColor((q.score / q.max_score) * 100)}`}>
                                        {q.score} / {q.max_score}
                                    </span>
                                </div>

                                <div className="question-content">
                                    <div className="question-text">
                                        <strong>Uppgift:</strong>
                                        <p>{q.question_text}</p>
                                    </div>

                                    <div className="answer-section">
                                        <div className="student-answer">
                                            <strong>Elevens svar:</strong>
                                            <p>{q.student_answer || 'Ej identifierat'}</p>
                                        </div>
                                        <div className="correct-answer">
                                            <strong>Korrekt lösning:</strong>
                                            <p>{q.correct_answer}</p>
                                        </div>
                                    </div>

                                    <div className="question-feedback">
                                        <strong>Feedback:</strong>
                                        <p>{q.feedback}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
