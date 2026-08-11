import { generateWAMessageFromContent, generateWAMessageContent, generateMessageID } from '@whiskeysockets/baileys';
import crypto from 'crypto';
import * as utils from '../utils/index.js';

export async function handleGroupStory(content, jid, quoted) {
    const targetJid = this._resolveJid(jid, quoted) || jid;
    const storyData = content.groupStatus || content;
    let messageContent;

    if (storyData.message) {
        messageContent = storyData;
    } else {
        messageContent = await generateWAMessageContent(storyData, {
            upload: this.client.waUploadToServer
        });
    }

    const msg = {
        message: {
            groupStatusMessageV2: {
                message: messageContent.message || messageContent
            }
        }
    };

    return await this.client.relayMessage(targetJid, msg.message, {
        messageId: generateMessageID()
    });
}

export async function handleGbLabel(content, jid, quoted) {
    const targetJid = this._resolveJid(jid, quoted) || jid;
    const x = content.groupLabel || content;
    if (!targetJid.endsWith('@g.us')) {
        throw new Error('Group JID required for handleGbLabel!');
    }

    const labelText = (x?.labelText || x?.text || (typeof x === 'string' ? x : '')).slice(0, 30);

    const msg = await generateWAMessageFromContent(targetJid, {
        protocolMessage: {
            type: "GROUP_MEMBER_LABEL_CHANGE",
            memberLabel: {
                label: labelText
            }
        }
    }, {});

    await this.client.relayMessage(targetJid, msg.message, {
        additionalNodes: [
            {
                tag: 'meta',
                attrs: {
                    tag_reason: 'user_update',
                    appdata: 'member_tag'
                },
                content: undefined
            }
        ]
    });
    return msg;
}

export async function handleEvent(content, jid, quoted) {
    const targetJid = this._resolveJid(jid, quoted);
    const eventData = content.eventMessage || content.event || content;

    let startDate = new Date();
    if (eventData.startTime) {
        startDate = typeof eventData.startTime === 'number' && eventData.startTime < 10000000000
            ? new Date(eventData.startTime * 1000)
            : new Date(eventData.startTime);
    } else if (eventData.startDate) {
        startDate = new Date(eventData.startDate);
    }

    let endDate = new Date(startDate.getTime() + 3600000);
    if (eventData.endTime) {
        endDate = typeof eventData.endTime === 'number' && eventData.endTime < 10000000000
            ? new Date(eventData.endTime * 1000)
            : new Date(eventData.endTime);
    } else if (eventData.endDate) {
        endDate = new Date(eventData.endDate);
    }

    const msg = generateWAMessageFromContent(targetJid, {
        viewOnceMessage: {
            message: {
                messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2,
                    messageSecret: crypto.randomBytes(32),
                    supportPayload: JSON.stringify({
                        version: 2,
                        is_ai_message: true,
                        should_show_system_message: true,
                        ticket_id: crypto.randomBytes(16).toString('hex')
                    })
                },
                eventMessage: {
                    contextInfo: {
                        mentionedJid: [targetJid],
                        participant: targetJid,
                        remoteJid: "status@broadcast"
                    },
                    isCanceled: eventData.isCanceled || false,
                    name: eventData.name || "Event",
                    description: eventData.description || "",
                    location: eventData.location || {
                        degreesLatitude: 0,
                        degreesLongitude: 0,
                        name: "Location"
                    },
                    joinLink: eventData.joinLink || "",
                    startTime: Math.floor(startDate.getTime() / 1000),
                    endTime: Math.floor(endDate.getTime() / 1000),
                    extraGuestsAllowed: eventData.extraGuestsAllowed !== false
                }
            }
        }
    }, {
        userJid: utils.getUserJid(this.client),
        quoted
    });

    await this.client.relayMessage(targetJid, msg.message, { messageId: msg.key.id });
    return msg;
}
