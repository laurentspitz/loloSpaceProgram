import { FirebaseService } from '../services/firebase';
import type { User } from 'firebase/auth';
import { NotificationManager } from './NotificationManager';
import i18next from '../services/i18n';

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

        // Language Switcher (Flag + Dropdown)
        const langContainer = document.createElement('div');
        langContainer.style.position = 'relative';
        langContainer.style.display = 'inline-block';
        langContainer.style.marginRight = '10px';

        const currentLangFlag = document.createElement('img');
        currentLangFlag.style.width = '24px';
        currentLangFlag.style.height = '16px';
        currentLangFlag.style.cursor = 'pointer';
        currentLangFlag.style.userSelect = 'none';
        currentLangFlag.src = this.getFlag(i18next.language);
        currentLangFlag.onclick = (e) => {
            e.stopPropagation();
            langDropdown.style.display = langDropdown.style.display === 'block' ? 'none' : 'block';
        };

        const langDropdown = document.createElement('div');
        langDropdown.style.display = 'none';
        langDropdown.style.position = 'absolute';
        langDropdown.style.top = '100%';
        langDropdown.style.right = '0';
        langDropdown.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        langDropdown.style.border = '1px solid #444';
        langDropdown.style.borderRadius = '4px';
        langDropdown.style.padding = '5px 0';
        langDropdown.style.zIndex = '3001';
        langDropdown.style.minWidth = '50px';

        const languages = [
            { code: 'en', flag: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCAzMCI+PGNsaXBQYXRoIGlkPSJ0Ij48cGF0aCBkPSJNMzAsMTVoMzB2MTV6djE1aC0zMHpoLTMwdi0xNXp2LTE1aDMweiIvPjwvY2xpcFBhdGg+PHBhdGggZD0iTTAsMHYzMGg2MHYtMzB6IiBmaWxsPSIjMDEyMTY5Ii8+PHBhdGggZD0iTTAsMGw2MCwzMG0wLTMwbC02MCwzMCIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjYiLz48cGF0aCBkPSJdMCwwbDYwLDMwbTAtMzBsLTYwLDMwIiBjbGlwLXBhdGg9InVybCgjdCkiIHN0cm9rZT0iI0M4MTAyRSIgc3Ryb2tlLXdpZHRoPSI0Ii8+PHBhdGggZD0iTTMwLDB2MzBNMCwxNWg2MCIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjEwIi8+PHBhdGggZD0iTTMwLDB2MzBNMCwxNWg2MCIgc3Ryb2tlPSIjQzgxMDJFIiBzdHJva2Utd2lkdGg9IjYiLz48L3N2Zz4=' },
            { code: 'fr', flag: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzIDIiPjxyZWN0IHdpZHRoPSIzIiBoZWlnaHQ9IjIiIGZpbGw9IiNFRDI5MzkiLz48cmVjdCB3aWR0aD0iMiIgaGVpZ2h0PSIyIiBmaWxsPSIjZmZmIi8+PHJlY3Qgd2lkdGg9IjEiIGhlaWdodD0iMiIgZmlsbD0iIzAwMjM5NSIvPjwvc3ZnPg==' }
        ];

        languages.forEach(lang => {
            const item = document.createElement('div');
            item.style.padding = '5px 10px';
            item.style.cursor = 'pointer';
            item.style.textAlign = 'center';

            const img = document.createElement('img');
            img.src = lang.flag;
            img.style.width = '24px';
            img.style.height = '16px';
            item.appendChild(img);

            item.onmouseover = () => item.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            item.onmouseout = () => item.style.backgroundColor = 'transparent';
            item.onclick = async () => {
                await i18next.changeLanguage(lang.code);
                currentLangFlag.src = lang.flag;
                langDropdown.style.display = 'none';
            };
            langDropdown.appendChild(item);
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            langDropdown.style.display = 'none';
        });

        langContainer.appendChild(currentLangFlag);
        langContainer.appendChild(langDropdown);
        this.container.appendChild(langContainer);

        // Status Text
        this.statusText = document.createElement('span');
        this.statusText.textContent = i18next.t('auth.notLoggedIn', 'Not logged in');
        this.container.appendChild(this.statusText);

        // Login Button
        this.loginButton = document.createElement('button');
        this.loginButton.textContent = i18next.t('auth.loginWithGoogle', 'Login with Google');
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
        this.logoutButton.textContent = i18next.t('auth.logout', 'Logout');
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

        // Listen for settings changes (nickname update)
        window.addEventListener('settings-changed', () => {
            this.updateUI();
        });

        // Listen for language changes to update UI texts
        i18next.on('languageChanged', () => {
            this.updateUI();
            // Update button texts specifically as they might not be covered by updateUI entirely if it only toggles visibility
            if (!this.loginButton.disabled) {
                this.loginButton.textContent = i18next.t('auth.loginWithGoogle', 'Login with Google');
            }
            this.logoutButton.textContent = i18next.t('auth.logout', 'Logout');

            // Update flag
            // Update flag
            currentLangFlag.src = this.getFlag(i18next.language);
        });
    }

    getFlag(lang: string): string {
        if (lang.startsWith('en')) return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCAzMCI+PGNsaXBQYXRoIGlkPSJ0Ij48cGF0aCBkPSJNMzAsMTVoMzB2MTV6djE1aC0zMHpoLTMwdi0xNXp2LTE1aDMweiIvPjwvY2xpcFBhdGg+PHBhdGggZD0iTTAsMHYzMGg2MHYtMzB6IiBmaWxsPSIjMDEyMTY5Ii8+PHBhdGggZD0iTTAsMGw2MCwzMG0wLTMwbC02MCwzMCIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjYiLz48cGF0aCBkPSJdMCwwbDYwLDMwbTAtMzBsLTYwLDMwIiBjbGlwLXBhdGg9InVybCgjdCkiIHN0cm9rZT0iI0M4MTAyRSIgc3Ryb2tlLXdpZHRoPSI0Ii8+PHBhdGggZD0iTTMwLDB2MzBNMCwxNWg2MCIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjEwIi8+PHBhdGggZD0iTTMwLDB2MzBNMCwxNWg2MCIgc3Ryb2tlPSIjQzgxMDJFIiBzdHJva2Utd2lkdGg9IjYiLz48L3N2Zz4=';
        if (lang.startsWith('fr')) return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzIDIiPjxyZWN0IHdpZHRoPSIzIiBoZWlnaHQ9IjIiIGZpbGw9IiNFRDI5MzkiLz48cmVjdCB3aWR0aD0iMiIgaGVpZ2h0PSIyIiBmaWxsPSIjZmZmIi8+PHJlY3Qgd2lkdGg9IjEiIGhlaWdodD0iMiIgZmlsbD0iIzAwMjM5NSIvPjwvc3ZnPg==';
        return '';
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
            this.loginButton.textContent = i18next.t('auth.loginWithGoogle');
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
        // Try to get nickname from local settings
        let displayName = "";
        try {
            const settingsStr = localStorage.getItem('user_settings');
            if (settingsStr) {
                const settings = JSON.parse(settingsStr);
                if (settings.nickname) {
                    displayName = settings.nickname;
                }
            }
        } catch (e) {
            // ignore
        }

        // Fallback to auth name
        if (!displayName && this.user) {
            displayName = this.user.displayName || 'Unknown Astronaut';
        }

        if (this.user || displayName) {
            // If we have a nickname but no user login, still show it? 
            // Requirement says "display instead of user name if exists".
            // Assuming we show profile if logged in OR if nickname is set (local profile).
            // But Login/Logout buttons depend on auth state.

            this.statusText.textContent = `👨‍🚀 ${displayName}`;
            this.statusText.title = this.user ? (this.user.displayName || '') : 'Local Profile';
            this.statusText.style.cursor = 'default';
            this.statusText.style.fontSize = '16px';

            if (this.user) {
                this.loginButton.style.display = 'none';
                this.logoutButton.style.display = 'block';
            } else {
                // If just local nickname, still allow login
                this.loginButton.style.display = 'block';
                this.logoutButton.style.display = 'none';
            }
        } else {
            this.statusText.textContent = i18next.t('auth.notLoggedIn');
            this.statusText.title = '';
            this.statusText.style.cursor = 'default';
            this.statusText.style.fontSize = 'inherit';
            this.loginButton.style.display = 'block';
            this.logoutButton.style.display = 'none';
        }
    }
}
