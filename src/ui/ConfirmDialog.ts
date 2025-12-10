/**
 * ConfirmDialog - A reusable modal for confirmation prompts
 */
export class ConfirmDialog {
    static show(
        title: string,
        message: string,
        onConfirm: () => void,
        onCancel: () => void = () => { },
        confirmText: string = 'Yes',
        cancelText: string = 'No'
    ) {
        // Create Overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        overlay.style.backdropFilter = 'blur(3px)';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '5000'; // High z-index to sit on top of everything

        // Create Dialog Box
        const dialog = document.createElement('div');
        dialog.className = 'game-modal-content'; // Reuse existing class if available, else style manually
        Object.assign(dialog.style, {
            backgroundColor: '#1a1a1a',
            border: '2px solid #444',
            borderRadius: '8px',
            padding: '30px',
            minWidth: '350px',
            maxWidth: '500px',
            fontFamily: "'Segoe UI', sans-serif",
            textAlign: 'center',
            boxShadow: '0 0 20px rgba(0,0,0,0.5)',
            color: '#eee'
        });

        // Title
        const titleEl = document.createElement('h3');
        titleEl.textContent = title;
        titleEl.style.color = '#fff';
        titleEl.style.marginTop = '0';
        titleEl.style.marginBottom = '15px';
        titleEl.style.fontSize = '22px';
        dialog.appendChild(titleEl);

        // Message
        const msgEl = document.createElement('p');
        msgEl.textContent = message;
        msgEl.style.color = '#ccc';
        msgEl.style.marginBottom = '25px';
        msgEl.style.lineHeight = '1.5';
        dialog.appendChild(msgEl);

        // Buttons Container
        const btns = document.createElement('div');
        btns.style.display = 'flex';
        btns.style.justifyContent = 'center';
        btns.style.gap = '20px';

        // Cancel Button
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = cancelText;
        cancelBtn.className = 'game-btn'; // Use game-btn class if valid
        Object.assign(cancelBtn.style, {
            padding: '10px 25px',
            background: 'transparent',
            border: '1px solid #666',
            color: '#ccc',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
        });
        cancelBtn.onmouseover = () => { cancelBtn.style.color = '#fff'; cancelBtn.style.borderColor = '#999'; };
        cancelBtn.onmouseout = () => { cancelBtn.style.color = '#ccc'; cancelBtn.style.borderColor = '#666'; };
        cancelBtn.onclick = () => {
            close();
            onCancel();
        };

        // Confirm Button
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = confirmText;
        confirmBtn.className = 'game-btn';
        Object.assign(confirmBtn.style, {
            padding: '10px 25px',
            background: 'rgba(76, 175, 80, 0.2)', // Green tint
            border: '1px solid #4CAF50',
            color: '#4CAF50',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
        });
        confirmBtn.onmouseover = () => { confirmBtn.style.background = 'rgba(76, 175, 80, 0.4)'; };
        confirmBtn.onmouseout = () => { confirmBtn.style.background = 'rgba(76, 175, 80, 0.2)'; };

        // Special styling for destructive actions?
        // We could add an isDangerous param, but keeping it simple for now.

        confirmBtn.onclick = () => {
            close();
            onConfirm();
        };

        btns.appendChild(confirmBtn);
        btns.appendChild(cancelBtn); // Confirm left, Cancel right (or swap based on preference - usually Primary Action right on Windows, Left on Mac/Web... let's stick to simple layout)
        // Wait, standard UI often has Primary on Right. 
        // Let's swap the order in code so Cancel is Left, Confirm is Right?
        // Actually, the previous implementation had Yes then No. 
        // Let's do Confirm (Primary) then Cancel.

        dialog.appendChild(btns);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Close function
        function close() {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }

        // Click outside to cancel
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                close();
                onCancel();
            }
        };
    }
}
