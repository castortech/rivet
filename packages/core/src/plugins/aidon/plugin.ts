import { type RivetPlugin } from '../../index.js';
import { chatAidonNode } from './nodes/ChatAidonNode.js';

export const aidonPlugin: RivetPlugin = {
	id: 'aidon',
	name: 'Aidon',

  register: (register) => {
    register(chatAidonNode());
  },
};
