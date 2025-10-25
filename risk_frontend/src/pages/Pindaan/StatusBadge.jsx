import React from 'react';
import './StatusBadge.css'; // Import CSS khusus

function StatusBadge({ status }) {
    return (
        <span className="status-badge" data-status={status}>
            {status}
        </span>
    );
}

export default StatusBadge;