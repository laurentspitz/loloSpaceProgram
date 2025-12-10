/**
 * Tooltip component for showing hover information
 */
export class Tooltip {
    private element: HTMLElement | null = null;

    show(x: number, y: number, title: string, description: string): void {
        if (!this.element) {
            this.element = document.createElement('div');
            this.element.style.position = 'fixed';
            this.element.style.backgroundColor = 'rgba(20, 20, 30, 0.95)';
            this.element.style.border = '1px solid #444';
            this.element.style.padding = '8px';
            this.element.style.borderRadius = '4px';
            this.element.style.color = '#ddd';
            this.element.style.fontFamily = 'sans-serif';
            this.element.style.fontSize = '12px';
            this.element.style.maxWidth = '250px';
            this.element.style.zIndex = '1000';
            this.element.style.pointerEvents = 'none';
            this.element.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
            document.body.appendChild(this.element);
        }

        this.element.innerHTML = `<strong style="color:white; display:block; margin-bottom:4px">${title}</strong>${description}`;
        this.element.style.display = 'block';
        this.element.style.left = (x + 15) + 'px';
        this.element.style.top = y + 'px';
    }

    hide(): void {
        if (this.element) {
            this.element.style.display = 'none';
        }
    }

    dispose(): void {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
    }
}
