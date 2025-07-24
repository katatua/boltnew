import { WebContainer } from '@webcontainer/api';
import { WORK_DIR_NAME } from '~/utils/constants';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('WebContainer');

interface WebContainerContext {
  loaded: boolean;
}

export const webcontainerContext: WebContainerContext = import.meta.hot?.data.webcontainerContext ?? {
  loaded: false,
};

if (import.meta.hot) {
  import.meta.hot.data.webcontainerContext = webcontainerContext;
}

export let webcontainer: Promise<WebContainer> = new Promise(() => {
  // noop for ssr
});

if (!import.meta.env.SSR) {
  webcontainer =
    import.meta.hot?.data.webcontainer ??
    Promise.resolve()
      .then(async () => {
        logger.info('Booting WebContainer...');
        const container = await WebContainer.boot({ workdirName: WORK_DIR_NAME });
        logger.info('WebContainer booted successfully');
        
        // Add some debugging for port events
        container.on('port', (port, type, url) => {
          logger.info(`WebContainer port event: ${port}, ${type}, ${url}`);
        });
        
        return container;
      })
      .then((webcontainer) => {
        webcontainerContext.loaded = true;
        logger.info('WebContainer context loaded');
        return webcontainer;
      })
      .catch((error) => {
        logger.error('Failed to boot WebContainer:', error);
        throw error;
      });

  if (import.meta.hot) {
    import.meta.hot.data.webcontainer = webcontainer;
  }
}