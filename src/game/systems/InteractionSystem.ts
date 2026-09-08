import Phaser from 'phaser';
import { bridge } from '../bridge';
import { areas, type Area } from '../world';
import type { Player } from '../entities/Player';
import type { NPC } from '../entities/NPC';
export class InteractionSystem {
  nearby: Area | null = null;
  private npc: NPC | null = null;
  constructor(
    private player: Player,
    private npcs: NPC[],
  ) {}
  update() {
    const nearest = areas
      .map((area) => ({
        area,
        distance: Phaser.Math.Distance.Between(this.player.x, this.player.y, area.x, area.y),
      }))
      .sort((a, b) => a.distance - b.distance)[0];
    const area = nearest.distance < 65 ? nearest.area : null;
    if (this.nearby?.id !== area?.id) {
      this.nearby = area;
      bridge.emit('nearby', area);
    }
    this.npc =
      this.npcs
        .filter((n) => !['bride', 'groom'].includes(n.dataRecord.kind))
        .find((n) => Phaser.Math.Distance.Between(this.player.x, this.player.y, n.x, n.y) < 51) ??
      null;
  }
  interact() {
    if (bridge.paused) return;
    if (this.nearby) bridge.emit('interact', this.nearby.id);
    else if (this.npc)
      bridge.emit('dialogue', {
        name: this.npc.dataRecord.name,
        message: this.npc.dataRecord.message,
      });
  }
  get hasTarget() {
    return !!(this.nearby || this.npc);
  }
}
