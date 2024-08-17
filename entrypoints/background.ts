import { ResponseType } from "@/src/types";
import { Tabs } from "wxt/browser";

const getAllTabs = async () => {
  const tabs = await browser.tabs.query({});
  return tabs.filter(
    (tab) => (tab.url && tab.url.startsWith("http")) || tab.discarded,
  );
};

const openTab = async (id: number) => {
  return await browser.tabs.update(id, { active: true });
};

type BackgroundResponse = ResponseType<Tabs.Tab[]> | ResponseType<boolean>;

export default defineBackground(() => {
  console.log("Hello background!", { id: browser.runtime.id });

  browser.commands.onCommand.addListener((command) => {
    if (command === "open-popup") {
      console.log("Open popup command received");
      browser.browserAction.openPopup();
    }
  });

  browser.runtime.onMessage.addListener(
    (message, sender, sendRes: (res: BackgroundResponse) => void) => {
      // console.log("Background Message:", message, "\n from:", sender);

      const type: string = message?.type;

      if (!type || typeof type !== "string") {
        console.error("No message type provided", { message });
        return;
      }

      if (type === "getTabs") {
        // console.log("Getting tabs");
        getAllTabs().then((tabs) => {
          // console.log("Sending tabs:", tabs);
          sendRes({
            type: "tabs",
            data: tabs,
          });
        });

        return true;
      }

      if (type === "openTab") {
        // console.log("Open tab");
        const tabid = message?.data;
        if (!tabid || typeof tabid !== "number") {
          console.error("No tab id provided", { message });
          return;
        }
        openTab(tabid).then(() => {
          sendRes({
            type: "success",
            data: true,
          });
        });

        return true;
      }
      if (type === "closeTabs") {
        // console.log("Closing tabs");
        const tabs = message?.data;
        if (!tabs || !Array.isArray(tabs)) {
          console.error("No tabs provided", { message });
          return;
        }

        if (tabs.length === 0) {
          // console.log("No tabs to close");
          return;
        }

        if (
          tabs.length > 0 &&
          tabs.some((tabid) => typeof tabid !== "number")
        ) {
          console.error("Invalid tab ids provided", { message });
          return;
        }

        Promise.all(
          tabs.map(async (tabid: number) => {
            await browser.tabs.remove(tabid);
          }),
        )
          .then(() => {
            // console.log("Tabs closed");
            sendRes({
              type: "closed_tabs",
              data: true,
            });
          })
          .catch((err) => {
            console.error("Error closing tabs:", err, { message });
            sendRes({
              type: "closed_tabs",
              data: false,
              error: err.toString(),
            });
          });

        return true;
      }

      console.warn("Unknown message type:", type, { message });
    },
  );
});
