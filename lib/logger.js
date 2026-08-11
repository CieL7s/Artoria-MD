const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    bgBlack: "\x1b[40m",
    bgRed: "\x1b[41m",
    bgGreen: "\x1b[42m",
    bgYellow: "\x1b[43m",
    bgBlue: "\x1b[44m",
    bgMagenta: "\x1b[45m",
    bgCyan: "\x1b[46m",
    bgWhite: "\x1b[47m"
};

const getTime = () => {
    const d = new Date();
    return `[${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}]`;
};

export const logInfo = (message) => {
    console.log(`${colors.cyan}${getTime()} ${colors.bgBlue}${colors.white} INFO ${colors.reset} ${colors.cyan}${message}${colors.reset}`);
};

export const logSuccess = (message) => {
    console.log(`${colors.cyan}${getTime()} ${colors.bgGreen}${colors.black} SUCCESS ${colors.reset} ${colors.green}${message}${colors.reset}`);
};

export const logWarn = (message) => {
    console.log(`${colors.cyan}${getTime()} ${colors.bgYellow}${colors.black} WARN ${colors.reset} ${colors.yellow}${message}${colors.reset}`);
};

export const logError = (message, err = '') => {
    console.log(`${colors.cyan}${getTime()} ${colors.bgRed}${colors.white} ERROR ${colors.reset} ${colors.red}${message}${colors.reset}`, err);
};

export const logMessage = ({ isGroup, isChannel, pushName, groupName, sender, text, isCmd }) => {
    const time = `${colors.cyan}${getTime()}${colors.reset}`;
    const type = isCmd ? `${colors.bgMagenta}${colors.white} CMD ${colors.reset}` : `${colors.bgCyan}${colors.black} MSG ${colors.reset}`;
    
    let chatType = '';
    if (isGroup) {
        chatType = `${colors.bgYellow}${colors.black} GROUP ${colors.reset} ${colors.yellow}${groupName}`;
    } else if (isChannel) {
        chatType = `${colors.bgBlue}${colors.white} CHANNEL ${colors.reset}`;
    } else {
        chatType = `${colors.bgGreen}${colors.black} PRIVATE ${colors.reset}`;
    }
    
    const nameColor = isCmd ? colors.magenta : colors.green;
    const nameStr = `${nameColor}${pushName} (${sender.split('@')[0]})${colors.reset}`;
    
    console.log(`${time} ${type} ${chatType} ${colors.dim}->${colors.reset} ${nameStr}`);
    if (text) {
        console.log(`  ${colors.dim}↳${colors.reset} ${colors.white}${text}${colors.reset}`);
    }
};

export default {
    logInfo,
    logSuccess,
    logWarn,
    logError,
    logMessage
};
