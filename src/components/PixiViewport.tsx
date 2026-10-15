// Based on https://codepen.io/inlet/pen/yLVmPWv.
// Copyright (c) 2018 Patrick Brouwer, distributed under the MIT license.

import { PixiComponent, useApp } from '@pixi/react';
import { Viewport } from 'pixi-viewport';
import { Application } from 'pixi.js';
import { MutableRefObject, ReactNode } from 'react';

export type ViewportProps = {
  app: Application;
  viewportRef?: MutableRefObject<Viewport | undefined>;

  screenWidth: number;
  screenHeight: number;
  worldWidth: number;
  worldHeight: number;
  children?: ReactNode;
};

// Smallest zoom: the whole map fits in the window.
function fitScale(p: { screenWidth: number; screenHeight: number; worldWidth: number; worldHeight: number }) {
  return Math.max(0.05, Math.min(p.screenWidth / p.worldWidth, p.screenHeight / p.worldHeight));
}

// https://davidfig.github.io/pixi-viewport/jsdoc/Viewport.html
export default PixiComponent('Viewport', {
  create(props: ViewportProps) {
    const { app, children, viewportRef, ...viewportProps } = props;
    const viewport = new Viewport({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      events: app.renderer.events,
      passiveWheel: false,
      ...viewportProps,
    });
    if (viewportRef) {
      viewportRef.current = viewport;
    }
    // Activate plugins
    viewport
      .drag()
      .pinch({})
      .wheel()
      .decelerate()
      .clamp({ direction: 'all', underflow: 'center' })
      .setZoom(-10)
      .clampZoom({ minScale: fitScale(props), maxScale: 3.0 });
    return viewport;
  },
  applyProps(viewport, oldProps: any, newProps: any) {
    // play-sim-town: on resize, keep the whole map visible as the zoomed-out limit
    if (
      oldProps.screenWidth !== newProps.screenWidth ||
      oldProps.screenHeight !== newProps.screenHeight
    ) {
      viewport.resize(newProps.screenWidth, newProps.screenHeight);
      viewport.setZoom(-10).clampZoom({ minScale: fitScale(newProps), maxScale: 3.0 });
      viewport.moveCenter(newProps.worldWidth / 2, newProps.worldHeight / 2);
    }
    Object.keys(newProps).forEach((p) => {
      if (p !== 'app' && p !== 'viewportRef' && p !== 'children' && oldProps[p] !== newProps[p]) {
        // @ts-expect-error Ignoring TypeScript here
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        viewport[p] = newProps[p];
      }
    });
  },
});
