import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LotmWorldMapView } from '../LotmWorldMapView';
import { useAppStore } from '../../../store/useAppStore';
import type { LocationEntry } from '../../../types';

// Mock LotmWorldMap to inspect passed props and simulate marker events
const mockMapProps = vi.fn();
vi.mock('../LotmWorldMap', () => ({
    LotmWorldMap: (props: unknown) => {
        mockMapProps(props);
        const p = props as {
            isDraggable?: boolean;
            locations?: Array<{ id: string; name: string; coordinates: [number, number] }>;
            onPinMove?: (id: string, name: string, coords: [number, number]) => void;
            activeLayers?: Record<string, boolean>;
        };
        return (
            <div data-testid="mock-lotm-world-map" data-draggable={p.isDraggable}>
                <span>Map Component</span>
                {p.onPinMove && (
                    <button
                        data-testid="simulate-pin-drag"
                        onClick={() => p.onPinMove?.('loc-1', 'Backlund', [-1120, 3950])}
                    >
                        Simulate Drag
                    </button>
                )}
            </div>
        );
    },
}));

describe('LotmWorldMapView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useAppStore.setState({
            locationLedger: [
                {
                    id: 'loc-1',
                    name: 'Backlund',
                    aliases: '',
                    broadLocation: 'Loen Kingdom',
                    features: [],
                    connections: [],
                    description: 'Capital city',
                    coordinates: [-1100, 3900],
                    firstSeenScene: '1',
                    lastSeenScene: '1',
                    source: 'manual',
                } as LocationEntry,
            ],
        });
    });

    it('renders only the simplified layer filters (Kingdoms, Cities, Seas)', () => {
        render(<LotmWorldMapView />);
        expect(screen.getByText('Kingdoms')).toBeInTheDocument();
        expect(screen.getByText('Cities')).toBeInTheDocument();
        expect(screen.getByText('Seas')).toBeInTheDocument();

        // Ensure obsolete path layers are gone
        expect(screen.queryByText('Campaign Routes')).not.toBeInTheDocument();
        expect(screen.queryByText('Reference Sea Lines')).not.toBeInTheDocument();
    });

    it('toggles calibration mode and sets draggable state on map', () => {
        render(<LotmWorldMapView />);
        
        // Initial state: not draggable
        expect(screen.queryByText(/Calibration Mode Active/i)).not.toBeInTheDocument();
        const calibrateBtn = screen.getByRole('button', { name: /Calibrate/i });

        // Toggle on
        fireEvent.click(calibrateBtn);
        expect(screen.getByText(/Calibration Mode Active: Drag any pin to reposition its coordinates/i)).toBeInTheDocument();
        
        const lastCall = mockMapProps.mock.calls[mockMapProps.mock.calls.length - 1][0];
        expect(lastCall.isDraggable).toBe(true);
    });

    it('handles pin drag updates and persists to store locationLedger', () => {
        render(<LotmWorldMapView />);
        const calibrateBtn = screen.getByRole('button', { name: /Calibrate/i });
        fireEvent.click(calibrateBtn);

        // Simulate dragging a pin
        const dragBtn = screen.getByTestId('simulate-pin-drag');
        fireEvent.click(dragBtn);

        // Verify location updated in store
        const updated = useAppStore.getState().locationLedger.find(l => l.id === 'loc-1');
        expect(updated?.coordinates).toEqual([-1120, 3950]);
    });

    it('opens export modal with JSON and TypeScript format options', () => {
        render(<LotmWorldMapView />);
        const exportBtn = screen.getByRole('button', { name: /Export Pins/i });
        fireEvent.click(exportBtn);

        expect(screen.getByText(/Export Map Pins/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /JSON Format/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /TypeScript/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Copy Code/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Download/i })).toBeInTheDocument();
    });
});
