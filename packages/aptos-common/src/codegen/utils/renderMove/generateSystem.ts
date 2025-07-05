import { DubheConfig } from '../../types';
import { formatAndWriteMove } from '../formatAndWrite';
import { existsSync } from 'fs';

export function generateSystem2(config: DubheConfig, srcPrefix: string) {
  config.systems.map((systemName) => {
    let code = `module ${config.name}::${systemName} {

}
`;
    formatAndWriteMove(
      code,
      `${srcPrefix}/contracts/${config.name}/sources/system/${systemName}.move`,
      'formatAndWriteMove'
    );
  });
}

export function generateNewSystem1(name: string, systemName: string, srcPrefix: string) {
  let code = `module ${name}::${systemName} {

}
`;
  formatAndWriteMove(
    code,
    `${srcPrefix}/contracts/${name}/sources/system/${systemName}.move`,
    'formatAndWriteMove'
  );
}

export function generateSystem(config: DubheConfig, srcPrefix: string) {
  config.systems.map((systemName) => {
    if (!existsSync(`${srcPrefix}/contracts/${config.name}/sources/system/${systemName}.move`)) {
      let code = `module ${config.name}::${systemName} {

}
`;
      formatAndWriteMove(
        code,
        `${srcPrefix}/contracts/${config.name}/sources/system/${systemName}.move`,
        'formatAndWriteMove'
      );
    }
  });
}
