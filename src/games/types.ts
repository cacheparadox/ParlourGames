import React from 'react';

export interface GameConfig {
  id: string;
  name: string;
  description: string;
  thumbnail: string; // Path to imported image asset
  rules: string[];
  component: React.ComponentType<any>;
  initializeState: (players: string[]) => any;
}
