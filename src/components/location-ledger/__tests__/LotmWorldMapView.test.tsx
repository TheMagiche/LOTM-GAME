import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LotmWorldMapView } from '../LotmWorldMapView';
import { useAppStore } from '../../../store/useAppStore';
import * as lotmMapPinsClient from '../../../services/lotm/lotmMapPinsClient';
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
        vi.spyOn(lotmMapPinsClient, 'fetchLotmMapPins').mockResolvedValue([
            {
                id: 'backlund',
                name: 'Backlund',
                type: 'city',
                category: 'Cities',
                coordinates: [-1100, 3900],
                description: 'Capital city',
            },
        ]);
        vi.spyOn(lotmMapPinsClient, 'saveLotmMapPins').mockResolvedValue({
            success: true,
            count: 1,
        });

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

    it('saves pins to backend file on clicking Save to File', async () => {
        render(<LotmWorldMapView />);
        const saveBtn = screen.getByRole('button', { name: /Save to File/i });
        fireEvent.click(saveBtn);

        await waitFor(() => {
            expect(lotmMapPinsClient.saveLotmMapPins).toHaveBeenCalled();
            expect(screen.getByText(/Saved 1 pins to file!/i)).toBeInTheDocument();
        });
    });

    it('reloads pins on clicking Load Data', async () => {
        render(<LotmWorldMapView />);
        const loadBtn = await screen.findByRole('button', { name: /Load Data/i });
        fireEvent.click(loadBtn);

        await waitFor(() => {
            expect(lotmMapPinsClient.fetchLotmMapPins).toHaveBeenCalled();
        });
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

    it('hides GM toolbars and disables calibration/picking in readOnly mode', () => {
        render(<LotmWorldMapView readOnly isPicking pickingLabel="Test Picking" />);

        // GM toolbar buttons should NOT be present
        expect(screen.queryByRole('button', { name: /Save to File/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Load Data/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Calibrate/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Export Pins/i })).not.toBeInTheDocument();

        // Picking banner and cursor coords HUD should be hidden
        expect(screen.queryByText('Test Picking')).not.toBeInTheDocument();
        expect(screen.queryByText(/Move cursor over map/i)).not.toBeInTheDocument();

        // Layer toggles and map itself should still be present
        expect(screen.getByText('Kingdoms')).toBeInTheDocument();
        expect(screen.getByText('Cities')).toBeInTheDocument();
        expect(screen.getByText('Seas')).toBeInTheDocument();
        expect(screen.getByTestId('mock-lotm-world-map')).toBeInTheDocument();

        // Map isDraggable should be false
        const lastCall = mockMapProps.mock.calls[mockMapProps.mock.calls.length - 1][0];
        expect(lastCall.isDraggable).toBe(false);
        expect(lastCall.isPicking).toBe(false);
    });
});
