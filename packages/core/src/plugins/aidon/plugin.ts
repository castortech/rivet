import { type RivetPlugin } from '../../index.js';
import { chatAidonNode } from './nodes/ChatAidonNode.js';

export const aidonPlugin: RivetPlugin = {
	id: 'aidon',
	name: 'Aidon',

  configSpec: {
    aidonURL: {
      type: 'string',
      label: 'Aidon URL',
      description: 'The URL for the Aidon application.',
      helperText: 'Defaults to https://app.aidon.ai. URL for the Aidon application.',
      default: 'https://app.aidon.ai',
    },
    aidonKey: {
      type: 'secret',
      label: 'Aidon API Key',
      description: 'The API Key for the Aidon application.',
      helperText: 'API Key for the Aidon application.',
    },
    fileBrowserURL: {
      type: 'string',
      label: 'FileBrowser URL',
      description: 'The URL for the FileBrowser service.',
      helperText: 'Defaults to https://ai-fb.aidon.ai. URL for the FileBrowser service.',
      default: 'https://ai-fb.aidon.ai',
    },
    fileBrowserUsername: {
      type: 'string',
      label: 'FileBrowser Username',
      description: 'The username for the FileBrowser service.',
      helperText: 'Enter username given to access FileBrowser.',
    },
    fileBrowserPassword: {
      type: 'secret',
      label: 'FileBrowser password',
      description: 'The password for the FileBrowser service.',
      helperText: 'Enter passord given to access FileBrowser.',
    },
  },

  register: (register) => {
    register(chatAidonNode());
  },
};
