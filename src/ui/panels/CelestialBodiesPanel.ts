import { Body } from '../../core/Body';
import { Tooltip } from '../components/Tooltip';
import { createCollapsiblePanel } from '../components/CollapsiblePanel';
import i18next from 'i18next';

export interface CelestialBodiesPanelOptions {
    bodies: Body[];
    onFocus: (body: Body) => void;
    onOrbit: (body: Body) => void;
    onTarget: (body: Body) => void;
}

/**
 * Celestial Bodies Panel - displays body hierarchy with focus/orbit/target controls
 */
export class CelestialBodiesPanel {
    private container: HTMLDivElement | null = null;
    private bodyList: HTMLDivElement | null = null;
    private tooltip: Tooltip;

    private bodies: Body[];
    private onFocus: (body: Body) => void;
    private onOrbit: (body: Body) => void;
    private onTarget: (body: Body) => void;

    constructor(options: CelestialBodiesPanelOptions) {
        this.bodies = options.bodies;
        this.onFocus = options.onFocus;
        this.onOrbit = options.onOrbit;
        this.onTarget = options.onTarget;
        this.tooltip = new Tooltip();
        this.create();
    }

    private create(): void {
        this.bodyList = document.createElement('div');
        this.bodyList.id = 'body-list';
        this.bodyList.style.maxHeight = '400px';
        this.bodyList.style.overflowY = 'auto';

        this.buildHierarchy();

        const { container } = createCollapsiblePanel(i18next.t('ui.celestialBodies'), this.bodyList, true);

        const wrapper = document.createElement('div');
        wrapper.id = 'celestial-bodies-panel';
        wrapper.style.position = 'absolute';
        wrapper.style.top = '170px';
        wrapper.style.right = '10px';
        wrapper.appendChild(container);

        document.body.appendChild(wrapper);
        this.container = wrapper;
    }

    private buildHierarchy(): void {
        if (!this.bodyList) return;
        this.bodyList.innerHTML = '';

        const buildRecursive = (bodies: Body[], parent: HTMLElement, indent: number) => {
            bodies.forEach(body => {
                this.addBodyRow(parent, body, indent);
                if (body.children && body.children.length > 0) {
                    const childrenContainer = document.createElement('div');
                    childrenContainer.style.display = 'block';
                    parent.appendChild(childrenContainer);
                    buildRecursive(body.children, childrenContainer, indent + 1);
                }
            });
        };

        const roots = this.bodies.filter(b => !b.parent);
        buildRecursive(roots, this.bodyList, 0);
    }

    private addBodyRow(parent: HTMLElement, body: Body, indentLevel: number): void {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.gap = '5px';
        row.style.marginBottom = '5px';
        row.style.marginLeft = `${indentLevel * 15}px`;
        row.style.alignItems = 'center';
        row.style.position = 'relative';

        if (indentLevel > 0) {
            row.style.borderLeft = '1px solid rgba(255,255,255,0.2)';
            row.style.paddingLeft = '5px';
        }

        // Body name label
        const label = document.createElement('span');
        label.innerText = body.name;
        label.style.color = body.color || 'white';
        label.style.fontFamily = 'monospace';
        label.style.fontSize = '12px';
        label.style.flex = '1';
        label.style.cursor = 'help';

        if (body.description) {
            label.title = "";
            label.onmouseenter = (e) => {
                this.tooltip.show(e.clientX, e.clientY, body.name, body.description!);
            };
            label.onmouseleave = () => {
                this.tooltip.hide();
            };
        }

        row.appendChild(label);

        // Focus button
        const focusBtn = document.createElement('button');
        focusBtn.innerText = '👁️';
        focusBtn.title = i18next.t('ui.focus', { name: body.name });
        focusBtn.style.padding = '2px 6px';
        focusBtn.style.fontSize = '10px';
        focusBtn.style.backgroundColor = '#333';
        focusBtn.style.border = '1px solid #555';
        focusBtn.style.color = 'white';
        focusBtn.style.cursor = 'pointer';
        focusBtn.onclick = () => this.onFocus(body);
        row.appendChild(focusBtn);

        // Orbit button
        const orbitBtn = document.createElement('button');
        orbitBtn.innerText = '🛸';
        orbitBtn.title = i18next.t('ui.orbit', { name: body.name });
        orbitBtn.style.padding = '2px 6px';
        orbitBtn.style.fontSize = '10px';
        orbitBtn.style.backgroundColor = '#333';
        orbitBtn.style.border = '1px solid #555';
        orbitBtn.style.color = 'white';
        orbitBtn.style.cursor = 'pointer';
        orbitBtn.onclick = () => this.onOrbit(body);
        row.appendChild(orbitBtn);

        // Target button
        const targetBtn = document.createElement('button');
        targetBtn.innerText = '🎯';
        targetBtn.title = i18next.t('ui.setTarget', { name: body.name });
        targetBtn.style.padding = '2px 6px';
        targetBtn.style.fontSize = '10px';
        targetBtn.style.backgroundColor = '#333';
        targetBtn.style.border = '1px solid #555';
        targetBtn.style.color = 'white';
        targetBtn.style.cursor = 'pointer';
        targetBtn.onclick = () => this.onTarget(body);
        row.appendChild(targetBtn);

        parent.appendChild(row);
    }

    setBodies(bodies: Body[]): void {
        this.bodies = bodies;
        this.buildHierarchy();
    }

    dispose(): void {
        this.tooltip.dispose();
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
