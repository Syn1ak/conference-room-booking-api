import { render, screen } from '@testing-library/angular';
import { BandTimelineComponent, TTimelineBand } from './band-timeline.component';

const BANDS: TTimelineBand[] = [
  { tone: 'morning', label: 'Morning', start: 360, end: 540, multiplier: 0.9 },
  { tone: 'standard', label: 'Standard', start: 540, end: 720, multiplier: 1 },
  { tone: 'peak', label: 'Peak', start: 720, end: 840, multiplier: 1.15 },
  { tone: 'standard', label: 'Standard', start: 840, end: 1080, multiplier: 1 },
  { tone: 'evening', label: 'Evening', start: 1080, end: 1380, multiplier: 0.8 },
];

describe('BandTimelineComponent', () => {
  it('lists each kind of band once, with its hours and rate', async () => {
    await render(BandTimelineComponent, { componentInputs: { bands: BANDS } });

    const legend = screen
      .getAllByRole('listitem')
      .map((item) => item.textContent?.replace(/\s+/g, ' ').trim());

    expect(legend).toEqual([
      'Morning 06:00–09:00 · −10%',
      'Standard 09:00–12:00, 14:00–18:00 · base rate',
      'Peak 12:00–14:00 · +15%',
      'Evening 18:00–23:00 · −20%',
    ]);
  });

  it('outlines a range over the day', async () => {
    const { container } = await render(BandTimelineComponent, {
      componentInputs: { bands: BANDS, highlight: { start: 11 * 60, end: 15 * 60 } },
    });

    const outline = container.querySelector('.ring-2') as HTMLElement;

    // 06:00–23:00 is 17 hours: 11:00 is 5/17 in, and 4 hours are 4/17 wide.
    expect(parseFloat(outline.style.left)).toBeCloseTo((5 / 17) * 100);
    expect(parseFloat(outline.style.width)).toBeCloseTo((4 / 17) * 100);
  });

  it('draws no outline for an empty range', async () => {
    const { container } = await render(BandTimelineComponent, {
      componentInputs: { bands: BANDS, highlight: { start: 600, end: 600 } },
    });

    expect(container.querySelector('.ring-2')).toBeNull();
  });
});
