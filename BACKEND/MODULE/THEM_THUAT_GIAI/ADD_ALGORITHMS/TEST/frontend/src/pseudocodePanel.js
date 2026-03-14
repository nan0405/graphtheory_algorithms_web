/**
 * PseudocodePanel.js
 *
 * Renders the pseudocode for the currently-selected algorithm.
 * The parent passes `activeKey` which is matched against each line's `key`
 * to apply the yellow highlight.
 */
import React from "react";

/**
 * @param {{ lines: Array<{key:string, text:string}>, activeKey: string }} props
 */
export default function PseudocodePanel({ lines = [], activeKey }) {
    return (
        <div id="pseudocode-panel">
            <h3>PSEUDOCODE</h3>
            <pre>
                {lines.map((line) => (
                    <span
                        key={line.key}
                        data-pc={line.key}
                        className={line.key === activeKey ? "active" : ""}
                    >
                        {line.text}
                    </span>
                ))}
            </pre>
        </div>
    );
}