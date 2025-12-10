import { Body } from '../../core/Body';
import { Rocket } from '../../entities/Rocket';
import { SphereOfInfluence } from '../../physics/SphereOfInfluence';
import { createCollapsiblePanel } from '../components/CollapsiblePanel';

export interface RocketInfoPanelOptions {
    bodies: Body[];
}

/**
 * Rocket Info Panel - displays rocket telemetry (fuel, velocity, altitude, etc.)
 */
export class RocketInfoPanel {
    private container: HTMLDivElement | null = null;
    private bodies: Body[] = [];

    // Display elements
    private fuelDisplay: HTMLElement | null = null;
    private fuelGaugeBar: HTMLElement | null = null;
    private electricityDisplay: HTMLElement | null = null;
    private electricityGaugeBar: HTMLElement | null = null;
    private deltaVDisplay: HTMLElement | null = null;
    private massDisplay: HTMLElement | null = null;
    private throttleDisplay: HTMLElement | null = null;
    private velocityDisplay: HTMLElement | null = null;
    private altitudeDisplay: HTMLElement | null = null;
    private gravityDisplay: HTMLElement | null = null;
    private soiDisplay: HTMLElement | null = null;

    constructor(options: RocketInfoPanelOptions) {
        this.bodies = options.bodies;
        this.create();
    }

    private create(): void {
        const content = document.createElement('div');
        content.style.display = 'flex';
        content.style.flexDirection = 'column';
        content.style.gap = '8px';

        // Fuel Row
        const fuelRow = document.createElement('div');
        fuelRow.style.display = 'flex';
        fuelRow.style.justifyContent = 'space-between';
        fuelRow.innerHTML = '<span>Fuel:</span> <span id="rocket-fuel">100%</span>';
        content.appendChild(fuelRow);
        this.fuelDisplay = fuelRow.querySelector('#rocket-fuel');

        // Fuel Gauge
        const fuelGaugeContainer = document.createElement('div');
        fuelGaugeContainer.style.height = '6px';
        fuelGaugeContainer.style.backgroundColor = '#333';
        fuelGaugeContainer.style.borderRadius = '3px';
        fuelGaugeContainer.style.overflow = 'hidden';
        fuelGaugeContainer.style.border = '1px solid #555';

        const fuelBar = document.createElement('div');
        fuelBar.style.width = '100%';
        fuelBar.style.height = '100%';
        fuelBar.style.backgroundColor = '#00C851';
        fuelBar.style.transition = 'width 0.2s, background-color 0.2s';

        fuelGaugeContainer.appendChild(fuelBar);
        content.appendChild(fuelGaugeContainer);
        this.fuelGaugeBar = fuelBar;

        // Electricity Row
        const elecRow = document.createElement('div');
        elecRow.style.display = 'flex';
        elecRow.style.justifyContent = 'space-between';
        elecRow.innerHTML = '<span>Electricity:</span> <span id="rocket-elec">100%</span>';
        content.appendChild(elecRow);
        this.electricityDisplay = elecRow.querySelector('#rocket-elec');

        // Electricity Gauge
        const elecGaugeContainer = document.createElement('div');
        elecGaugeContainer.style.height = '6px';
        elecGaugeContainer.style.backgroundColor = '#333';
        elecGaugeContainer.style.borderRadius = '3px';
        elecGaugeContainer.style.overflow = 'hidden';
        elecGaugeContainer.style.border = '1px solid #555';

        const elecBar = document.createElement('div');
        elecBar.style.width = '100%';
        elecBar.style.height = '100%';
        elecBar.style.backgroundColor = '#FFEB3B';
        elecBar.style.transition = 'width 0.2s, background-color 0.2s';

        elecGaugeContainer.appendChild(elecBar);
        content.appendChild(elecGaugeContainer);
        this.electricityGaugeBar = elecBar;

        // Stats Grid
        const statsGrid = document.createElement('div');
        statsGrid.style.display = 'grid';
        statsGrid.style.gridTemplateColumns = '1fr 1fr';
        statsGrid.style.gap = '8px 12px';
        statsGrid.style.fontSize = '12px';

        const createStat = (label: string, id: string, suffix: string) => {
            const div = document.createElement('div');
            div.innerHTML = `<span style="color:#aaa">${label}:</span> <span id="${id}" style="float:right; color:white">0 ${suffix}</span>`;
            return div;
        };

        const dvStat = createStat('Delta V', 'rocket-dv', 'm/s');
        const massStat = createStat('Mass', 'rocket-mass', 'kg');
        const throttleStat = createStat('Throttle', 'rocket-throttle', '%');
        const velStat = createStat('Velocity', 'rocket-vel', 'm/s');
        const altStat = createStat('Altitude', 'rocket-alt', 'km');
        const gravStat = createStat('Gravity', 'rocket-grav', 'm/s²');

        statsGrid.appendChild(dvStat);
        statsGrid.appendChild(massStat);
        statsGrid.appendChild(throttleStat);
        statsGrid.appendChild(velStat);
        statsGrid.appendChild(altStat);
        statsGrid.appendChild(gravStat);

        content.appendChild(statsGrid);

        // References
        this.deltaVDisplay = dvStat.querySelector('#rocket-dv');
        this.massDisplay = massStat.querySelector('#rocket-mass');
        this.throttleDisplay = throttleStat.querySelector('#rocket-throttle');
        this.velocityDisplay = velStat.querySelector('#rocket-vel');
        this.altitudeDisplay = altStat.querySelector('#rocket-alt');
        this.gravityDisplay = gravStat.querySelector('#rocket-grav');

        // SOI Row
        const soiRow = document.createElement('div');
        soiRow.style.fontSize = '12px';
        soiRow.style.marginTop = '4px';
        soiRow.style.borderTop = '1px solid #444';
        soiRow.style.paddingTop = '4px';
        soiRow.innerHTML = '<span style="color:#aaa">Influence:</span> <span id="rocket-soi" style="float:right">-</span>';
        content.appendChild(soiRow);
        this.soiDisplay = soiRow.querySelector('#rocket-soi');

        // Create Panel
        const { container } = createCollapsiblePanel('ROCKET TELEMETRY', content, false, '240px');
        container.id = 'rocket-info-panel';
        container.style.position = 'absolute';
        container.style.bottom = '10px';
        container.style.left = '10px';

        document.body.appendChild(container);
        this.container = container;
    }

    setBodies(bodies: Body[]): void {
        this.bodies = bodies;
    }

    update(rocket: Rocket): { nearestBody: Body | null } {
        if (!rocket || !this.container) return { nearestBody: null };

        if (this.container.style.display === 'none') {
            this.container.style.display = 'block';
        }

        const info = rocket.getInfo();

        // Fuel
        if (this.fuelDisplay) {
            this.fuelDisplay.innerText = `${info.fuel.toFixed(1)}%`;
            this.fuelDisplay.style.color = info.fuel < 10 ? '#ff4444' : (info.fuel < 30 ? '#ffbb33' : '#00C851');
        }

        if (this.fuelGaugeBar) {
            this.fuelGaugeBar.style.width = `${info.fuel}%`;
            this.fuelGaugeBar.style.backgroundColor = info.fuel < 20 ? '#ff4444' : (info.fuel < 50 ? '#ffbb33' : '#00C851');
        }

        // Electricity
        if (this.electricityDisplay && info.maxElectricity > 0) {
            const elecPercent = (info.electricity / info.maxElectricity) * 100;
            this.electricityDisplay.innerText = `${info.electricity.toFixed(1)} / ${info.maxElectricity.toFixed(0)}`;

            if (this.electricityGaugeBar) {
                this.electricityGaugeBar.style.width = `${elecPercent}%`;
                this.electricityGaugeBar.style.backgroundColor = elecPercent < 20 ? '#ff4444' : '#FFEB3B';
            }
        } else if (this.electricityDisplay) {
            this.electricityDisplay.innerText = "0 / 0";
            if (this.electricityGaugeBar) this.electricityGaugeBar.style.width = "0%";
        }

        if (this.deltaVDisplay) {
            this.deltaVDisplay.innerText = `${info.deltaV.toFixed(0)} m/s`;
        }

        if (this.massDisplay) {
            this.massDisplay.innerText = `${info.mass.toFixed(0)} kg`;
        }

        if (this.throttleDisplay) {
            const throttle = rocket.controls ? (rocket.controls.throttle * 100).toFixed(0) : '0';
            this.throttleDisplay.innerText = `${throttle}%`;
        }

        // Find nearest body
        let nearestBody: Body | null = null;
        let minDist = Infinity;

        this.bodies.forEach(b => {
            if (b.name === 'Rocket') return;
            const visualRadius = b.radius * 3.0;
            const dist = b.position.distanceTo(rocket.body.position) - visualRadius;
            if (dist < minDist) {
                minDist = dist;
                nearestBody = b;
            }
        });

        if (this.velocityDisplay) {
            let velocity = info.velocity;
            if (nearestBody !== null) {
                const nb = nearestBody as Body;
                const relVel = rocket.body.velocity.sub(nb.velocity);
                velocity = relVel.mag();
            }
            this.velocityDisplay.innerText = `${velocity.toFixed(0)} m/s`;
        }

        if (this.altitudeDisplay) {
            if (nearestBody !== null) {
                const nb = nearestBody as Body;
                const altKm = (minDist / 1000).toFixed(1);
                this.altitudeDisplay.innerText = `${altKm} km`;

                const r = rocket.body.position.distanceTo(nb.position);
                const g = (6.674e-11 * nb.mass) / (r * r);
                if (this.gravityDisplay) {
                    this.gravityDisplay.innerText = `${g.toFixed(2)} m/s²`;
                }

                if (this.soiDisplay) {
                    const dominantBody = SphereOfInfluence.findDominantBody(rocket, this.bodies);
                    this.soiDisplay.innerText = dominantBody.name;
                    if (dominantBody.type === 'star') {
                        this.soiDisplay.style.color = '#FFD700';
                    } else if (dominantBody.type === 'moon') {
                        this.soiDisplay.style.color = '#CCCCCC';
                    } else {
                        this.soiDisplay.style.color = '#4CAF50';
                    }
                }
            } else {
                this.altitudeDisplay.innerText = 'N/A';
                if (this.gravityDisplay) this.gravityDisplay.innerText = '0 m/s²';
            }
        }

        return { nearestBody: nearestBody as Body | null };
    }

    getContainer(): HTMLDivElement | null {
        return this.container;
    }

    dispose(): void {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
