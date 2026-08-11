import { generateWAMessageFromContent, generateWAMessage } from '@whiskeysockets/baileys';
import crypto from 'crypto';
import * as utils from '../utils/index.js';

export async function handleAlbum(content, jid, quoted) {
    const targetJid = this._resolveJid(jid, quoted);
    const array = Array.isArray(content.albumMessage)
        ? content.albumMessage
        : (Array.isArray(content.album) ? content.album : (Array.isArray(content) ? content : []));

    if (array.length === 0) {
        throw new Error('albumMessage requires a non-empty array of media items!');
    }

    const userJid = utils.getUserJid(this.client);

    const album = await generateWAMessageFromContent(targetJid, {
        messageContextInfo: {
            messageSecret: crypto.randomBytes(32),
        },
        albumMessage: {
            expectedImageCount: array.filter((a) => Object.prototype.hasOwnProperty.call(a, "image")).length,
            expectedVideoCount: array.filter((a) => Object.prototype.hasOwnProperty.call(a, "video")).length,
        },
    }, {
        userJid,
        quoted,
        upload: this.client.waUploadToServer
    });

    await this.client.relayMessage(targetJid, album.message, {
        messageId: album.key.id,
    });

    for (let cnt of array) {
        const img = await generateWAMessage(targetJid, cnt, {
            upload: this.client.waUploadToServer,
        });

        img.message.messageContextInfo = {
            messageSecret: crypto.randomBytes(32),
            messageAssociation: {
                associationType: 1,
                parentMessageKey: album.key,
            },
            participant: "0@s.whatsapp.net",
            remoteJid: "status@broadcast",
            forwardingScore: 99999,
            isForwarded: true,
            mentionedJid: [targetJid],
            starred: true,
            labels: ["Y", "Important"],
            isHighlighted: true,
        };

        await this.client.relayMessage(targetJid, img.message, {
            messageId: img.key.id,
            quoted: {
                key: {
                    remoteJid: album.key.remoteJid,
                    id: album.key.id,
                    fromMe: true,
                    participant: userJid,
                },
                message: album.message,
            },
        });
    }
    return album;
}
