import { Injectable, OnDestroy, signal } from '@angular/core';
import type { Achievement, Journey, RankTier } from './journey.service';
export interface RewardEvent {
  kind: 'achievement' | 'rank' | 'xp';
  title: string;
  description: string;
  xp: number;
  rank?: RankTier;
  achievement?: Achievement;
  preview?: boolean;
}
interface ProgressSnapshot {
  version: 1;
  xp: number;
  highestRank: number;
  unlocked: string[];
}
@Injectable({ providedIn: 'root' })
export class ProgressionService implements OnDestroy {
  readonly current = signal<RewardEvent | null>(null);
  readonly remaining = signal(0);
  private queue: RewardEvent[] = [];
  private snapshots = new Map<number, ProgressSnapshot>();
  private timer?: ReturnType<typeof setTimeout>;
  observe(journey: Journey) {
    if (!journey.accountId) return;
    const account = journey.accountId;
    const previous = this.read(account);
    const earned = journey.achievements.filter((a) => a.unlocked);
    const next: ProgressSnapshot = {
      version: 1,
      xp: journey.xp,
      highestRank: Math.max(
        previous?.highestRank ?? 0,
        0,
      ),
      unlocked: [
        ...new Set([...(previous?.unlocked ?? []), ...earned.map((a) => a.id)]),
      ],
    };
    this.write(account, next);
    // Existing history becomes a quiet baseline. Only newly observed milestones celebrate.
    if (!previous) return;
    const events: RewardEvent[] = earned
      .filter((a) => !previous.unlocked.includes(a.id))
      .map((a) => ({
        kind: 'achievement',
        title: a.name,
        description: a.description,
        xp: a.xp,
        achievement: a,
      }));
    this.enqueue(events);
  }
  preview(_rank: RankTier) {}
  advance() {
    this.clearTimer();
    this.current.set(this.queue.shift() ?? null);
    this.remaining.set(this.queue.length);
    this.resume();
  }
  dismissAll() {
    this.queue = [];
    this.clearTimer();
    this.current.set(null);
    this.remaining.set(0);
  }
  pause() {
    this.clearTimer();
  }
  resume() {
    this.clearTimer();
    if (this.current() && this.current()!.kind !== 'rank')
      this.timer = setTimeout(() => this.advance(), 5000);
  }
  ngOnDestroy() {
    this.clearTimer();
  }
  private enqueue(events: RewardEvent[]) {
    this.queue.push(...events);
    if (!this.current()) this.advance();
    else this.remaining.set(this.queue.length);
  }
  private clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }
  private read(account: number): ProgressSnapshot | undefined {
    try {
      const raw = localStorage.getItem(`form.progression.v1.${account}`);
      if (raw) {
        const data = JSON.parse(raw) as ProgressSnapshot;
        if (
          data.version === 1 &&
          Number.isInteger(data.xp) &&
          data.xp >= 0 &&
          Number.isInteger(data.highestRank) &&
          data.highestRank >= 0 &&
          data.highestRank <= 8 &&
          Array.isArray(data.unlocked) &&
          data.unlocked.every((id) => typeof id === 'string')
        )
          return data;
      }
    } catch {
      /* Storage may be unavailable in private browsing. */
    }
    return this.snapshots.get(account);
  }
  private write(account: number, snapshot: ProgressSnapshot) {
    this.snapshots.set(account, snapshot);
    try {
      localStorage.setItem(
        `form.progression.v1.${account}`,
        JSON.stringify(snapshot),
      );
    } catch {
      /* In-memory tracking keeps the current session working. */
    }
  }
}
