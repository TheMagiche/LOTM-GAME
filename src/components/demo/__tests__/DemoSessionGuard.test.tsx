import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../../store/useAppStore';
import { DemoSessionGuard } from '../DemoSessionGuard';
import { exitLotmCampaign } from '../../lotm/LotmPlayHeader';
import { purgeDemoSessionCampaigns } from '../../../services/demo/demoSession';

vi.mock('../../../config/demoMode', async () => {
    const actual = await vi.importActual<typeof import('../../../config/demoMode')>('../../../config/demoMode');
    return { ...actual, IS_DEMO_MODE: true };
});

vi.mock('../../lotm/LotmPlayHeader', () => ({
    exitLotmCampaign: vi.fn().mockResolvedValue(undefined),
    LotmPlayHeader: () => null,
}));

vi.mock('../../../services/demo/demoSession', async () => {
    const actual = await vi.importActual<typeof import('../../../services/demo/demoSession')>('../../../services/demo/demoSession');
    return {
        ...actual,
        heartbeatDemoOccupancy: vi.fn().mockResolvedValue({ ok: false, lost: false }),
        purgeDemoSessionCampaigns: vi.fn().mockResolvedValue(undefined),
        getDemoSessionId: () => 'demo_session_test1',
    };
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    useAppStore.setState({ activeCampaignId: null, demoSessionExpiresAt: null });
});

describe('DemoSessionGuard', () => {
    beforeEach(() => {
        vi.mocked(exitLotmCampaign).mockClear();
        vi.mocked(purgeDemoSessionCampaigns).mockClear();
    });

    it('warns in the last minute and logs out at zero without resetting on activity', async () => {
        vi.useFakeTimers();
        const now = Date.now();
        useAppStore.setState({
            activeCampaignId: 'camp_1',
            demoSessionExpiresAt: now + 1500,
        });
        render(<DemoSessionGuard />);

        expect(screen.getByRole('dialog', { name: /Session expiring/i })).toBeInTheDocument();

        window.dispatchEvent(new Event('mousemove'));
        await vi.advanceTimersByTimeAsync(2000);

        expect(exitLotmCampaign).toHaveBeenCalled();
        expect(purgeDemoSessionCampaigns).toHaveBeenCalled();
    });
});
