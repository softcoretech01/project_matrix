import React from 'react';
import { EmptyState } from './ui';

// Temporary placeholder for modules delivered in a later build phase.
export default function Placeholder({ title = 'Module', icon = 'ph-wrench', note = '' }) {
  return (
    <EmptyState
      icon={icon}
      title={`${title}`}
      message={note || 'This module is being assembled in the current build phase and will appear here shortly.'}
    />
  );
}
