
import React from 'react';

interface MarkdownRendererProps {
    content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
    // Basic regex-based markdown parser
    const parseContent = (text: string) => {
        // Handle code blocks
        const blocks = text.split(/(```[\s\S]*?```)/);

        return blocks.map((block, idx) => {
            if (block.startsWith('```')) {
                const match = block.match(/```(\w+)?\n([\s\S]*?)```/);
                const code = match ? match[2] : block.slice(3, -3);
                return (
                    <pre key={idx} className="bg-slate-100 dark:bg-slate-900 p-3 rounded-lg overflow-x-auto my-3 text-sm font-mono border border-slate-200 dark:border-slate-700">
                        {code}
                    </pre>
                );
            }

            // Enhanced Table Detection
            const lines = block.split('\n');
            const elements: React.ReactNode[] = [];
            let currentTableRows: string[][] = [];
            let inTable = false;
            let currentParagraphLines: string[] = [];

            const flushParagraph = (key: string) => {
                if (currentParagraphLines.length > 0) {
                    const paraText = currentParagraphLines.join('\n').trim();
                    if (paraText) {
                        // Check for list items within the paragraph
                        if (paraText.trim().startsWith('- ') || paraText.trim().startsWith('* ') || /^\d+\./.test(paraText.trim())) {
                            const listLines = paraText.split('\n');
                            const isOrdered = /^\d+\./.test(listLines[0].trim());
                            const ListTag = isOrdered ? 'ol' : 'ul';
                            elements.push(
                                <ListTag key={key} className={`list-${isOrdered ? 'decimal' : 'disc'} ml-6 mb-4 space-y-1`}>
                                    {listLines.map((li, liIdx) => (
                                        <li key={liIdx}>{formatInline(li.replace(/^(\d+\.|-|[*])\s+/, ''))}</li>
                                    ))}
                                </ListTag>
                            );
                        } else {
                            elements.push(
                                <p key={key} className="mb-4 whitespace-pre-wrap last:mb-0">
                                    {formatInline(paraText)}
                                </p>
                            );
                        }
                    }
                    currentParagraphLines = [];
                }
            };

            const flushTable = (key: string) => {
                if (currentTableRows.length > 0) {
                    elements.push(renderTable(currentTableRows, key));
                    currentTableRows = [];
                    inTable = false;
                }
            };

            lines.forEach((line, lineIdx) => {
                const trimmedLine = line.trim();
                const isMarkdownTableLine = trimmedLine.includes('|');
                const isTabTableLine = line.includes('\t');

                if (isMarkdownTableLine || isTabTableLine) {
                    if (!inTable) {
                        flushParagraph(`para-pre-${lineIdx}`);
                        inTable = true;
                    }

                    let cells: string[] = [];
                    if (isMarkdownTableLine) {
                        cells = line.split('|').map(c => c.trim()).filter((c, i, a) => {
                            // Keep cells if they are between delimiters or if the line doesn't start/end with |
                            const startsWithPipe = line.trim().startsWith('|');
                            const endsWithPipe = line.trim().endsWith('|');
                            if (startsWithPipe && i === 0) return false;
                            if (endsWithPipe && i === a.length - 1) return false;
                            return true;
                        });
                    } else if (isTabTableLine) {
                        cells = line.split('\t').map(c => c.trim());
                    }
                    currentTableRows.push(cells);
                } else if (inTable) {
                    flushTable(`table-${lineIdx}`);
                    currentParagraphLines.push(line);
                } else {
                    currentParagraphLines.push(line);
                }
            });

            flushTable(`table-final-${idx}`);
            flushParagraph(`para-final-${idx}`);

            return <React.Fragment key={idx}>{elements}</React.Fragment>;
        });
    };

    const renderTable = (rows: string[][], key: string) => {
        if (rows.length < 1) return null;

        let header = rows[0];
        let body = rows.slice(1);

        // Check for separator row | --- | --- |
        const hasSeparator = rows[1] && rows[1].every(cell => cell.match(/^-+:?$/) || cell.trim() === '---');
        if (hasSeparator) {
            body = rows.slice(2);
        }

        return (
            <div key={key} className="overflow-x-auto my-4 border rounded-lg border-slate-200 dark:border-slate-700 shadow-sm">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                        <tr>
                            {header.map((cell, i) => (
                                <th key={i} className="px-4 py-2 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider border-r last:border-0 border-slate-200 dark:border-slate-700">
                                    {formatInline(cell)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {body.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                                {row.map((cell, j) => (
                                    <td key={j} className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300 border-r last:border-0 border-slate-200 dark:border-slate-700">
                                        {formatInline(cell)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const formatInline = (text: string) => {
        let elements: (string | React.ReactNode)[] = [text];

        // **bold**
        elements = elements.flatMap(el => {
            if (typeof el !== 'string') return el;
            const parts = el.split(/(\*\*.*?\*\*)/);
            return parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i} className="font-bold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>;
                }
                return part;
            });
        });

        // [^1] citations
        elements = elements.flatMap(el => {
            if (typeof el !== 'string') return el;
            const parts = el.split(/(\[\^\d+\])/);
            return parts.map((part, i) => {
                if (part.startsWith('[^') && part.endsWith(']')) {
                    const num = part.slice(2, -1);
                    return (
                        <sup key={i} className="text-[10px] font-bold text-blue-600 dark:text-blue-400 ml-0.5 cursor-help" title={`Источник ${num}`}>
                            {num}
                        </sup>
                    );
                }
                return part;
            });
        });

        // *italic* (optional, but good to have)
        elements = elements.flatMap(el => {
            if (typeof el !== 'string') return el;
            const parts = el.split(/(\*.*?\*)/);
            return parts.map((part, i) => {
                const isBold = para => para.startsWith('**') && para.endsWith('**'); // Avoid conflict
                if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
                    return <em key={i} className="italic">{part.slice(1, -1)}</em>;
                }
                return part;
            });
        });

        return <>{elements}</>;
    };

    return (
        <div className="markdown-renderer text-[15px] leading-relaxed">
            {parseContent(content)}
        </div>
    );
};

export default MarkdownRenderer;
