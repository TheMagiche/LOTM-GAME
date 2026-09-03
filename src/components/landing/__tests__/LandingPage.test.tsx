import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEMO_PLAY_PATH } from '../../../config/demoMode';
import { LandingPage } from '../LandingPage';
import {
    LANDING_HERO,
    LANDING_LOADER,
    LANDING_PILLARS,
    LANDING_FOOTER,
    LANDING_CREATOR_URL,
    LANDING_SPONSOR_URL,
    LANDING_ENGINE_REPO_URL,
    LANDING_WIKI_URL,
    LANDING_SPECIAL_THANKS,
    LANDING_COLLAGE_CARDS,
} from '../landingCopy';

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

function stubImagesToLoad() {
    class ImmediateImage {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_value: string) {
            queueMicrotask(() => this.onload?.());
        }
    }
    vi.stubGlobal('Image', ImmediateImage);
}

describe('LandingPage', () => {
    it('shows a LOTM-themed loader until hero portraits are ready', async () => {
        stubImagesToLoad();
        render(<LandingPage />);

        expect(screen.getByRole('status', { name: LANDING_LOADER.detail })).toBeInTheDocument();
        expect(screen.getByText(LANDING_LOADER.detail)).toBeInTheDocument();
        expect(
            screen.getByText(LANDING_LOADER.portraitsLabel(0, LANDING_COLLAGE_CARDS.length)),
        ).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.queryByRole('status', { name: LANDING_LOADER.detail })).not.toBeInTheDocument();
        });
    });

    it('renders the hero section with brand title, subcopy, and playable demo link', () => {
        render(<LandingPage />);
        expect(
            screen.getByRole('heading', { name: new RegExp(LANDING_HERO.brand, 'i'), level: 1 })
        ).toBeInTheDocument();
        expect(screen.getByText(LANDING_HERO.sub)).toBeInTheDocument();

        const demoLinks = screen.getAllByRole('link', { name: new RegExp(LANDING_HERO.cta, 'i') });
        expect(demoLinks.length).toBeGreaterThan(0);
        expect(demoLinks[0]).toHaveAttribute('href', DEMO_PLAY_PATH);
    });

    it('renders interactive showcase tabs and switches between characters and pathways', () => {
        render(<LandingPage />);
        const charTab = screen.getByRole('button', { name: /tarot club & beyonders/i });
        const pathwayTab = screen.getByRole('button', { name: /22 divine pathways/i });
        expect(charTab).toBeInTheDocument();
        expect(pathwayTab).toBeInTheDocument();

        fireEvent.click(pathwayTab);
        const foolPathwayElements = screen.getAllByText(/fool pathway/i);
        expect(foolPathwayElements.length).toBeGreaterThan(0);

        fireEvent.click(charTab);
        expect(screen.getByText(/the fool that doesn’t belong to this era/i)).toBeInTheDocument();
    });

    it('renders all core occult mechanic pillars', () => {
        render(<LandingPage />);
        for (const pillar of LANDING_PILLARS) {
            expect(screen.getByRole('heading', { name: new RegExp(pillar.title, 'i') })).toBeInTheDocument();
        }
    });

    it('renders privacy, self-host, and platform sections', () => {
        render(<LandingPage />);
        expect(screen.getByRole('heading', { name: /bring your own key/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /self-host the chronicle/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /desktop builds/i })).toBeInTheDocument();
    });

    it('renders the sponsor the project section with Ko-fi link', () => {
        render(<LandingPage />);
        expect(screen.getByRole('heading', { name: /sponsor the project/i })).toBeInTheDocument();
        const sponsorLinks = screen.getAllByRole('link', { name: /sponsor on ko-fi/i });
        expect(sponsorLinks.length).toBeGreaterThan(0);
        expect(sponsorLinks[0]).toHaveAttribute('href', LANDING_SPONSOR_URL);
    });

    it('renders special thanks section with source engine and wiki links', () => {
        render(<LandingPage />);
        expect(screen.getByRole('heading', { name: /special thanks/i })).toBeInTheDocument();
        for (const credit of LANDING_SPECIAL_THANKS.credits) {
            expect(screen.getByRole('heading', { name: new RegExp(credit.name, 'i') })).toBeInTheDocument();
        }

        const links = screen.getAllByRole('link');
        const engineLink = links.find(l => l.getAttribute('href') === LANDING_ENGINE_REPO_URL);
        expect(engineLink).toBeDefined();

        const wikiLink = links.find(l => l.getAttribute('href') === LANDING_WIKI_URL);
        expect(wikiLink).toBeDefined();
    });

    it('renders creator website link, MIT license, and fan-content IP disclaimer in footer', () => {
        render(<LandingPage />);
        const creatorLink = screen.getByRole('link', { name: new RegExp(LANDING_FOOTER.creatorLabel, 'i') });
        expect(creatorLink).toHaveAttribute('href', LANDING_CREATOR_URL);

        expect(screen.getByText(LANDING_FOOTER.license)).toBeInTheDocument();
        expect(screen.getByText(LANDING_FOOTER.disclaimer)).toBeInTheDocument();
    });
});
