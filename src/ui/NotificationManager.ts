export class NotificationManager {
    private static container: HTMLDivElement | null = null;

    private static init() {
        if (this.container) return;
        this.container = document.createElement('div');
        this.container.style.position = 'fixed';
        this.container.style.bottom = '20px';
        this.container.style.left = '50%';
        this.container.style.transform = 'translateX(-50%)';
        this.container.style.zIndex = '10000';
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.gap = '10px';
        this.container.style.pointerEvents = 'none'; // Click through
        document.body.appendChild(this.container);
    }

    static show(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration = 3000) {
        this.init();

        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.padding = '10px 20px';
        toast.style.borderRadius = '5px';
        toast.style.color = '#fff';
        toast.style.fontSize = '14px';
        toast.style.boxShadow = '0 2px 10px rgba(0,0,0,0.5)';
        toast.style.fontFamily = 'Segoe UI, sans-serif';
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        toast.style.minWidth = '200px';
        toast.style.textAlign = 'center';

        if (type === 'success') toast.style.backgroundColor = '#4CAF50';
        else if (type === 'error') toast.style.backgroundColor = '#F44336';
        else toast.style.backgroundColor = '#2196F3';

        this.container!.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => toast.style.opacity = '1');

        // Remove
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }, duration);
    }
}
