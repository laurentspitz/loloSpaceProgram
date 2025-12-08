import { FirebaseService } from '../services/firebase';
import type { User } from 'firebase/auth';
import { NotificationManager } from './NotificationManager';

export class AuthMenu {
    container: HTMLDivElement;
    user: User | null = null;
    loginButton: HTMLButtonElement;
    logoutButton: HTMLButtonElement;
    statusText: HTMLSpanElement;

    constructor() {
        this.container = document.createElement('div');
        this.container.style.position = 'absolute';
        this.container.style.top = '10px';
        this.container.style.right = '10px';
        this.container.style.zIndex = '3000';
        this.container.style.display = 'flex';
        this.container.style.alignItems = 'center';
        this.container.style.gap = '10px';
        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.container.style.padding = '5px 10px';
        this.container.style.borderRadius = '5px';
        this.container.style.color = 'white';
        this.container.style.fontFamily = 'monospace';

        // Status Text
        this.statusText = document.createElement('span');
        this.statusText.textContent = 'Not logged in';
        this.container.appendChild(this.statusText);

        // Login Button
        this.loginButton = document.createElement('button');
        this.loginButton.textContent = 'Login with Google';
        this.loginButton.style.padding = '5px 10px';
        this.loginButton.style.cursor = 'pointer';
        this.loginButton.style.backgroundColor = '#4285F4';
        this.loginButton.style.color = 'white';
        this.loginButton.style.border = 'none';
        this.loginButton.style.borderRadius = '3px';
        this.loginButton.onclick = () => this.handleLogin();
        this.container.appendChild(this.loginButton);

        // Logout Button (Hidden initially)
        this.logoutButton = document.createElement('button');
        this.logoutButton.textContent = 'Logout';
        this.logoutButton.style.padding = '5px 10px';
        this.logoutButton.style.cursor = 'pointer';
        this.logoutButton.style.backgroundColor = '#d9534f';
        this.logoutButton.style.color = 'white';
        this.logoutButton.style.border = 'none';
        this.logoutButton.style.borderRadius = '3px';
        this.logoutButton.style.display = 'none';
        this.logoutButton.onclick = () => this.handleLogout();
        this.container.appendChild(this.logoutButton);

        document.body.appendChild(this.container);

        // Listen for auth state changes
        FirebaseService.onAuthStateChanged((user) => {
            this.user = user;
            this.updateUI();
        });
    }

    async handleLogin() {
        this.loginButton.disabled = true;
        this.loginButton.textContent = "Logging in...";
        try {
            await FirebaseService.loginWithGoogle();
        } catch (error: any) {
            console.error("Login Error:", error);
            // Don't alert if user just closed the popup manually
            if (error.code !== 'auth/cancelled-popup-request' && error.code !== 'auth/popup-closed-by-user') {
                NotificationManager.show("Login failed: " + error.message, 'error');
            }
            // Re-enable button if failed
            this.loginButton.disabled = false;
            this.loginButton.textContent = "Login with Google";
        }
    }

    async handleLogout() {
        try {
            await FirebaseService.logout();
        } catch (error) {
            console.error("Logout Error:", error);
        }
    }

    updateUI() {
        if (this.user) {
            this.statusText.textContent = `👤 ${this.user.displayName}`;
            this.loginButton.style.display = 'none';
            this.logoutButton.style.display = 'block';
        } else {
            this.statusText.textContent = 'Not logged in';
            this.loginButton.style.display = 'block';
            this.logoutButton.style.display = 'none';
        }
    }
}
