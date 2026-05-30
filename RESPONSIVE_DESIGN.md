# Responsive Design System & useResponsive Hook Guide

This document defines the architecture, hooks, and guidelines for building responsive, adaptive, and fluid layouts in AAI LMS Mobile that scale perfectly across all mobile form factors, orientations, and tablet sizes.

---

## 1. The Core Hook: `useResponsive`

To avoid layout lag, layout snapshots that miss orientation changes, and fragile device hardcoding, AAI LMS Mobile uses a reactive hook: `useResponsive()`.

### Key Capabilities
1. **Dynamic Scaling**: Evaluates dimensions reactively on every frame or layout change using `useWindowDimensions()`.
2. **Fluid Interpolation**: Interpolates spacing, padding, or font sizes dynamically between standard phone and tablet layouts.
3. **Responsive Variant Picking**: Selects tailored property values for the current active breakpoint with fallback rules.
4. **Layout Grid Constants**: Standardizes layout constraints (e.g. form max-width, tablet gutters, split screen sizes).

---

## 2. Breakpoints & Device Classes

Breakpoints are aligned with standard native device classes:

| Breakpoint | Window Width | Class / Profile | Typical Devices |
|---|---|---|---|
| `xs` | `< 390dp` | Small Portrait Phone | iPhone SE, small Android devices |
| `sm` | `390dp - 767dp` | Standard Phone / Landscape Phone | iPhone 15, Galaxy S24, landscape phones |
| `md` | `768dp - 1023dp` | Tablet Portrait | iPad Mini, iPad 10th Gen, portrait tablets |
| `lg` | `1024dp - 1279dp`| Tablet Landscape / Small Laptop | iPad Pro landscape, foldables |
| `xl` | `≥ 1280dp` | Desktop / Wide Screen Tablet | Large tablets, external displays |

---

## 3. Hook API Reference

Import `useResponsive` from `@/hooks`:

```typescript
import { useResponsive } from '@/hooks';

const {
  width,
  height,
  breakpoint,
  isPhone,
  isTablet,
  isLandscape,
  fluid,
  responsive,
  formMaxWidth,
  horizontalPadding,
  verticalPadding,
  contentConstraints
} = useResponsive();
```

### Properties
- **`width` & `height`**: The current window width and height. Reacts instantly to split-screen, multitasking, or rotation.
- **`breakpoint`**: The active breakpoint key (`'xs' | 'sm' | 'md' | 'lg' | 'xl'`).
- **`isPhone`**: boolean helper indicating `width < 768dp`.
- **`isTablet`**: boolean helper indicating `width >= 768dp`.
- **`isLandscape`**: boolean helper indicating `width > height`.

### Utilities

#### `fluid(phoneValue: number, tabletValue: number): number`
Linearly interpolates between two numbers based on screen width.
- Anchor minimum: 390dp (Standard phone width)
- Anchor maximum: 768dp (Tablet width)
- **Use case**: Perfect for sizing paddings, font sizes, or card heights that need to scale naturally instead of suddenly jumping.

```typescript
// Scales from 20dp padding on phone to 40dp padding on tablet
const padding = fluid(20, 40);
```

#### `responsive<T>(values: Partial<Record<Breakpoint, T>>, fallback: T): T`
Selects the value matched to the current active breakpoint. Walks down the breakpoint chain (`xl` → `lg` → `md` → `sm` → `xs`) until it finds a defined value, otherwise returning the fallback.

```typescript
// Changes flexDirection depending on device width
const flexDirection = responsive({
  md: 'row',
  xs: 'column'
}, 'column');
```

---

## 4. Layout Constraints & Design Tokens

To prevent stretched fields and poor ergonomics on tablet screens, follow these layout rules:

### Standard Gutters & Spacing
- **Horizontal Paddings**: Always use `useResponsive().horizontalPadding` (fluidly shifts from 20dp on phones to 40dp on tablets).
- **Vertical Paddings**: Always use `useResponsive().verticalPadding` (fluidly shifts from 24dp to 48dp).

### Center Constraints (`contentConstraints`)
- Large screens must not stretch text or input fields fully.
- Wrap content columns on tablets in a container styled with `useResponsive().contentConstraints`:
```typescript
const { contentConstraints } = useResponsive();

return (
  <View style={contentConstraints}>
    {/* Form contents here will never stretch wider than 560dp and will center automatically on tablets */}
  </View>
);
```

### Form Constraints (`formMaxWidth`)
- Auth cards, login forms, and modal fields should have a maximum width of `480dp` on tablets to remain legible and cohesive.
- Apply `maxWidth: formMaxWidth` on form components.

---

## 5. Architectural Coding Standards

1. **NEVER use `Dimensions.get('window')` or `Dimensions.get('screen')`**
   - *Reason*: Dimensions are evaluated once at app startup and do not update when a device rotates, enters split-screen, or changes resolution.
   - *Alternative*: Always use `useResponsive()`, which wraps `useWindowDimensions()` reactively.

2. **Leverage Flexbox & Percentage Bounds first**
   - Use responsive hooks to adjust spacing and column rules, not to calculate every absolute coordinate. Rely on flex constraints (`flex: 1`, `width: '100%'`, `maxWidth`) for high performance.

3. **Check `process.env.EXPO_OS` for Platform-specific Rules**
   - For OS-specific behaviors, use `process.env.EXPO_OS` (e.g. `'ios' | 'android' | 'web'`). It compiles away dead code in production bundles.

4. **Test Landscapes and Multi-tasking Splits**
   - When launching on tablet emulators, drag the multi-tasking boundary or rotate the screen to ensure the layout adapts seamlessly without clipping or overlaps.
