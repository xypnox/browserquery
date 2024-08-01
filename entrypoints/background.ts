import { ResponseType } from '@/src/types';
import { Tabs } from 'wxt/browser';

const getAllTabs = async () => {
  const tabs = await browser.tabs.query({});
  return tabs.filter((tab) => tab.url && tab.url.startsWith('http'));
}

type BackgroundResponse = ResponseType<Tabs.Tab[]> | ResponseType<boolean>;

export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });

  browser.runtime.onMessage.addListener((message, sender, sendRes: (res: BackgroundResponse) => void) => {
    console.log('Received message:', message, 'from:', sender);

    const type: string = message?.type;

    if (!type || typeof type !== 'string') {
      console.error('No message type provided');
      return;
    }

    if (type === 'getTabs') {
      console.log('Getting tabs');
      getAllTabs().then((tabs) => {
        console.log('Sending tabs:', tabs);
        sendRes({
          type: 'tabs',
          data: tabs,
        });
      })

      return true;
    }

    if (type === 'closeTabs') {
      console.log('Closing tabs');
      const tabs = message?.data;
      if (!tabs || !Array.isArray(tabs)) {
        console.error('No tabs provided');
        return;
      }

      if (tabs.length === 0) {
        console.log('No tabs to close');
        return;
      }

      if (tabs.length > 0 && tabs.some((tabid) => typeof tabid !== 'number')) {
        console.error('Invalid tab ids provided');
        return;
      }

      Promise.all(tabs.map(async (tabid: number) => {
        await browser.tabs.remove(tabid);
      })).then(() => {
        console.log('Tabs closed');
        sendRes({
          type: 'closed_tabs',
          data: true,
        });
      }).catch((err) => {
        console.error('Error closing tabs:', err);
        sendRes({
          type: 'closed_tabs',
          data: false,
          error: err.toString(),
        });
      });

      return true;
    }



    console.log('Unknown message type:', type);
  });



});
