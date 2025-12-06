# Adding a New Part - Example Guide

## Quick Start: Create a Custom Engine

This guide shows you how to add a completely new part to the game in just a few steps.

### Step 1: Create the Part Directory

```bash
mkdir -p src/parts/engine-custom
```

### Step 2: Create `config.json`

```json
{
  "id": "engine_custom",
  "name": "Custom Super Engine",
  "type": "engine",
  "description": "Your amazing new engine with custom specifications.",
  "dimensions": {
    "width": 2.5,
    "height": 4.0
  },
  "stats": {
    "mass": 1500,
    "cost": 3000000,
    "thrust": 800000,
    "isp": 320
  },
  "nodes": [
    {
      "id": "top",
      "position": { "x": 0, "y": 2.0 },
      "direction": { "x": 0, "y": 1 },
      "type": "top"
    }
  ],
  "visual": {
    "effect": "standard"
  }
}
```

### Step 3: Create `index.ts`

```typescript
import { BasePart } from '../BasePart';
import type { PartConfig, ParticleEffectConfig } from '../PartConfig';
import configData from './config.json';
import { StandardFlameEffect } from '../behaviors/StandardFlameEffect';

const config = configData as PartConfig;

export class EngineCustom extends BasePart {
    id = config.id;
    config = config;
    private effect = new StandardFlameEffect();

    loadTexture(): string {
        return new URL('./texture.png', import.meta.url).href;
    }

    getParticleEffect(): ParticleEffectConfig {
        return this.effect.getConfig();
    }
}

export default new EngineCustom();
```

### Step 4: Add `texture.png`

Place your engine texture in `src/parts/engine-custom/texture.png`.

**Texture Requirements:**
- Size: Any (will be scaled)
- Format: PNG with transparency
- Recommended: 90px width for consistency

### Step 5: Test

```bash
npm run dev
```

Open the Hangar and your part should appear automatically! 🎉

## Advanced: Create a Custom Particle Effect

### Create `src/parts/behaviors/GreenFlameEffect.ts`

```typescript
import { ParticleEffect, type ParticleEffectConfig } from '../ParticleEffect';

export class GreenFlameEffect extends ParticleEffect {
    getConfig(): ParticleEffectConfig {
        return {
            type: 'custom',
            colors: {
                initial: { r: 0.5, g: 1.0, b: 0.5 },  // Bright green
                mid: { r: 0.2, g: 0.8, b: 0.2 },      // Medium green
                final: { r: 0.6, g: 0.8, b: 0.6 }     // Light green smoke
            },
            sizes: {
                initial: 220,
                max: 850
            },
            spread: 0.13,
            nozzleRadius: 3.0
        };
    }
}
```

### Use in Your Part

```typescript
import { GreenFlameEffect } from '../behaviors/GreenFlameEffect';

export class EngineCustom extends BasePart {
    private effect = new GreenFlameEffect(); // ← Use custom effect
    // ...
}
```

## Part Types Reference

| Type | Use Case | Required Stats |
|------|----------|----------------|
| `capsule` | Command pods | mass, cost |
| `tank` | Fuel containers | mass, cost, fuel |
| `engine` | Propulsion | mass, cost, thrust, isp |
| `rcs` | Attitude control | mass, cost, thrust, isp |
| `decoupler` | Stage separation | mass, cost |
| `structure` | Misc parts | mass, cost |

## Available Particle Effects

- **StandardFlameEffect**: Orange/yellow flame (default)
- **BlueFlameEffect**: Cyan/blue high-performance flame
- **RCSEffect**: Small white puffs
- **Custom**: Create your own!

## Tips

1. **IDs**: Use lowercase with underscores (e.g., `my_cool_engine`)
2. **Balance**: Match thrust/mass ratio to existing parts
3. **Nodes**: Position affects center of mass calculations
4. **Testing**: Check in Hangar before flight

That's it! The modular system handles everything else automatically.
