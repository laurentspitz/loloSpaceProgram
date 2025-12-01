/**
 * Hangar - Placeholder for the rocket building scene
 */
export class Hangar {
    container: HTMLDivElement;

    constructor() {
        this.container = document.createElement('div');
        this.container.id = 'hangar-container';
        this.container.style.position = 'absolute';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.backgroundColor = '#1a1a1a';
        this.container.style.color = 'white';
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.justifyContent = 'center';
        this.container.style.alignItems = 'center';
        this.container.style.fontFamily = 'Arial, sans-serif';
        this.container.style.zIndex = '1000';

        const title = document.createElement('h1');
        title.textContent = 'Rocket Hangar';
        this.container.appendChild(title);

        const message = document.createElement('p');
        message.textContent = 'Under Construction - Coming Soon!';
        this.container.appendChild(message);

        const backButton = document.createElement('button');
        backButton.textContent = 'Back to Menu';
        backButton.style.padding = '10px 20px';
        backButton.style.marginTop = '20px';
        backButton.style.fontSize = '18px';
        backButton.style.cursor = 'pointer';
        backButton.onclick = () => {
            // Dispatch event to go back to menu
            window.dispatchEvent(new CustomEvent('navigate-menu'));
        };
        this.container.appendChild(backButton);

        document.body.appendChild(this.container);
    }

    dispose() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
