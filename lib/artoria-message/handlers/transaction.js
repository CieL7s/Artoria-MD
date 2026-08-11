import { generateWAMessageFromContent, generateWAMessageContent } from '@whiskeysockets/baileys';
import crypto from 'crypto';
import * as utils from '../utils/index.js';

export async function handlePayment(content, jid, quoted) {
    const targetJid = this._resolveJid(jid, quoted);
    const data = content.requestPaymentMessage || content;
    let notes = {};

    if (data.sticker?.stickerMessage) {
        notes = {
            stickerMessage: {
                ...data.sticker.stickerMessage,
                contextInfo: {
                    stanzaId: quoted?.key?.id,
                    participant: quoted?.key?.participant || this.client.user?.id,
                    quotedMessage: quoted?.message
                }
            }
        };
    } else if (data.note) {
        notes = {
            extendedTextMessage: {
                text: data.note,
                contextInfo: {
                    stanzaId: quoted?.key?.id,
                    participant: quoted?.key?.participant || this.client.user?.id,
                    quotedMessage: quoted?.message
                }
            }
        };
    }

    const msg = generateWAMessageFromContent(targetJid, {
        requestPaymentMessage: {
            expiryTimestamp: data.expiry || 0,
            amount1000: data.amount || 0,
            currencyCodeIso4217: data.currency || "IDR",
            requestFrom: data.from || utils.getUserJid(this.client) || "0@s.whatsapp.net",
            noteMessage: notes,
            background: data.background || {
                id: "DEFAULT",
                placeholderArgb: 0xFFF0F0F0
            }
        }
    }, {
        userJid: utils.getUserJid(this.client),
        quoted
    });

    await this.client.relayMessage(targetJid, msg.message, { messageId: msg.key.id });
    return msg;
}

export async function handleProduct(content, jid, quoted) {
    const targetJid = this._resolveJid(jid, quoted);
    const productData = content.productMessage || content;
    const {
        title,
        description,
        thumbnail,
        productId,
        retailerId,
        url,
        priceAmount1000 = null,
        currencyCode = "IDR"
    } = productData;

    let productImage;
    if (thumbnail) {
        try {
            const media = await utils.fetchMediaBuffer(thumbnail);
            if (media) {
                const { imageMessage } = await generateWAMessageContent(
                    { image: media },
                    { upload: this.client.waUploadToServer }
                );
                productImage = imageMessage;
            }
        } catch (err) {
            console.error("[CustomMessages] Error preparing product thumbnail:", err.message);
        }
    }

    const msg = generateWAMessageFromContent(targetJid, {
        viewOnceMessage: {
            message: {
                messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2,
                    messageSecret: crypto.randomBytes(32)
                },
                productMessage: {
                    product: {
                        productImage,
                        productId,
                        title,
                        description,
                        currencyCode,
                        priceAmount1000,
                        retailerId,
                        url,
                        productImageCount: productImage ? 1 : 0
                    },
                    businessOwnerJid: utils.getUserJid(this.client) || "0@s.whatsapp.net"
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

export async function handleOrderMessage(content, jid, quoted) {
    const targetJid = this._resolveJid(jid, quoted);
    const orderData = content.orderMessage || content;
    const msg = generateWAMessageFromContent(targetJid, {
        orderMessage: {
            orderId: orderData.orderId || ("ORDER" + Date.now()),
            thumbnail: orderData.thumbnail || null,
            itemCount: orderData.itemCount || 0,
            status: "ACCEPTED",
            surface: "CATALOG",
            message: orderData.message || "",
            orderTitle: orderData.orderTitle || "",
            sellerJid: utils.getUserJid(this.client) || "0@s.whatsapp.net",
            token: orderData.token || "TOKEN",
            totalAmount1000: orderData.totalAmount1000 || 0,
            totalCurrencyCode: orderData.totalCurrencyCode || "IDR",
            messageVersion: 2
        }
    }, {
        userJid: utils.getUserJid(this.client),
        quoted
    });

    await this.client.relayMessage(targetJid, msg.message, { messageId: msg.key.id });
    return msg;
}

export async function handlePollResult(content, jid, quoted) {
    const targetJid = this._resolveJid(jid, quoted);
    const pollData = content.pollResultMessage || content;
    const votes = Array.isArray(pollData.pollVotes) ? pollData.pollVotes : [];
    const msg = generateWAMessageFromContent(targetJid, {
        pollResultSnapshotMessage: {
            name: pollData.name || "",
            pollVotes: votes.map(vote => ({
                optionName: vote.optionName || "",
                optionVoteCount: typeof vote.optionVoteCount === 'number'
                    ? vote.optionVoteCount.toString()
                    : (vote.optionVoteCount || "0")
            })),
            contextInfo: {
                isForwarded: true,
                forwardingScore: 1
            }
        }
    }, {
        userJid: utils.getUserJid(this.client),
        quoted
    });

    await this.client.relayMessage(targetJid, msg.message, { messageId: msg.key.id });
    return msg;
}
