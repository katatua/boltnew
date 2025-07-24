import type { WebContainer } from '@webcontainer/api';
import { atom } from 'nanostores';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('PreviewsStore');

export interface PreviewInfo {
  port: number;
  ready: boolean;
  baseUrl: string;
}

export class PreviewsStore {
  #availablePreviews = new Map<number, PreviewInfo>();
  #webcontainer: Promise<WebContainer>;

  previews = atom<PreviewInfo[]>([]);

  constructor(webcontainerPromise: Promise<WebContainer>) {
    this.#webcontainer = webcontainerPromise;
    this.#init();
  }

  async #init() {
    try {
      const webcontainer = await this.#webcontainer;
      
      logger.info('Initializing preview store with webcontainer');

      webcontainer.on('port', (port, type, url) => {
        logger.info(`Port event: ${port}, type: ${type}, url: ${url}`);
        
        let previewInfo = this.#availablePreviews.get(port);

        if (type === 'close' && previewInfo) {
          logger.info(`Closing preview for port ${port}`);
          this.#availablePreviews.delete(port);
          this.previews.set(this.previews.get().filter((preview) => preview.port !== port));
          return;
        }

        const previews = this.previews.get();

        if (!previewInfo) {
          logger.info(`Creating new preview for port ${port}`);
          previewInfo = { port, ready: type === 'open', baseUrl: url };
          this.#availablePreviews.set(port, previewInfo);
          previews.push(previewInfo);
        }

        previewInfo.ready = type === 'open';
        previewInfo.baseUrl = url;

        logger.info(`Updated preview info:`, previewInfo);
        this.previews.set([...previews]);
      });

      // Listen for server events
      webcontainer.on('server-ready', (port, url) => {
        logger.info(`Server ready on port ${port}: ${url}`);
      });

    } catch (error) {
      logger.error('Failed to initialize preview store:', error);
    }
  }
}