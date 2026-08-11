import { generateWAMessageContent, proto } from '@whiskeysockets/baileys';
import * as utils from '../utils/index.js';

export async function handleInteractiveButtons(content, jid, quoted) {
    const targetJid = this._resolveJid(jid, quoted);
    if (Array.isArray(content.interactiveButtons)) {
        const buttons = content.interactiveButtons.map((btn) => {
            if (btn.name && btn.buttonParamsJson) return btn;
            const name = btn.name || (btn.url ? 'cta_url' : btn.copyCode ? 'cta_copy' : btn.phone ? 'cta_call' : 'quick_reply');
            let params = {};
            if (name === 'cta_url') params = { display_text: btn.displayText || btn.text || '', url: btn.url };
            else if (name === 'cta_copy') params = { display_text: btn.displayText || btn.text || 'Copy', copy_code: btn.copyCode || btn.code };
            else if (name === 'cta_call') params = { display_text: btn.displayText || btn.text || 'Call', phone_number: btn.phoneNumber || btn.phone };
            else params = { display_text: btn.displayText || btn.text || '', id: btn.id || btn.buttonId || '' };

            return { name, buttonParamsJson: JSON.stringify(params) };
        });

        const headerFields = { hasMediaAttachment: false };
        if (content.title) headerFields.title = content.title;
        if (content.subtitle) headerFields.subtitle = content.subtitle;
        if (content.image) {
            headerFields.hasMediaAttachment = true;
            try {
                const media = await utils.fetchMediaBuffer(content.image);
                if (this.client?.waUploadToServer && media) {
                    const { imageMessage } = await generateWAMessageContent(
                        { image: media },
                        { upload: this.client.waUploadToServer }
                    );
                    if (imageMessage) headerFields.imageMessage = imageMessage;
                    else headerFields.imageMessage = { url: typeof content.image === 'string' ? content.image : content.image.url };
                } else {
                    headerFields.imageMessage = { url: typeof content.image === 'string' ? content.image : content.image.url };
                }
            } catch (err) {
                headerFields.imageMessage = { url: typeof content.image === 'string' ? content.image : content.image.url };
            }
        } else if (content.video) {
            headerFields.hasMediaAttachment = true;
            try {
                const media = await utils.fetchMediaBuffer(content.video);
                if (this.client?.waUploadToServer && media) {
                    const { videoMessage } = await generateWAMessageContent(
                        { video: media },
                        { upload: this.client.waUploadToServer }
                    );
                    if (videoMessage) headerFields.videoMessage = videoMessage;
                    else headerFields.videoMessage = { url: typeof content.video === 'string' ? content.video : content.video.url };
                } else {
                    headerFields.videoMessage = { url: typeof content.video === 'string' ? content.video : content.video.url };
                }
            } catch (err) {
                headerFields.videoMessage = { url: typeof content.video === 'string' ? content.video : content.video.url };
            }
        }

        const interactiveContent = proto.Message.InteractiveMessage.create({
            header: proto.Message.InteractiveMessage.Header.create(headerFields),
            body: proto.Message.InteractiveMessage.Body.create({ text: content.text || content.caption || '' }),
            footer: proto.Message.InteractiveMessage.Footer.create({ text: content.footer || '' }),
            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({ buttons }),
        });

        return await utils.relayInteractive(this.client, targetJid, interactiveContent, {
            quoted,
            badge: content.badge !== false,
            mentions: content.mentions || [],
            nonJidMentions: content.nonJidMentions || 0,
        });
    }

    try {
        const { sendInteractiveMessage } = await import('@ryuu-reinzz/button-helper');
        const payload = {
            text: content.text || content.caption || "",
            footer: content.footer || "",
            interactiveButtons: content.interactiveButtons
        };

        if (content.title) payload.title = content.title;
        if (content.subtitle) payload.subtitle = content.subtitle;
        if (content.image) payload.image = content.image;
        if (content.video) payload.video = content.video;
        if (content.document) payload.document = content.document;

        return await sendInteractiveMessage(this.client, targetJid, payload, {
            contextInfo: content.contextInfo || {
                forwardingScore: 999,
                isForwarded: true
            }
        });
    } catch (err) {
        console.error("[CustomMessages] error in handleInteractiveButtons fallback:", err);
        throw err;
    }
}

export async function handleCarousel(content, jid, quoted) {
    const targetJid = this._resolveJid(jid, quoted);
    const carouselData = content.carouselMessage || content.carousel || content;
    const cards = carouselData.cards || content.carousel?.cards || content.cards || [];

    const mappedCards = await Promise.all(cards.map(async (card) => {
        const headerFields = { hasMediaAttachment: false };
        if (card.image) {
            headerFields.hasMediaAttachment = true;
            try {
                const media = await utils.fetchMediaBuffer(card.image);
                if (this.client?.waUploadToServer && media) {
                    const { imageMessage } = await generateWAMessageContent(
                        { image: media },
                        { upload: this.client.waUploadToServer }
                    );
                    if (imageMessage) headerFields.imageMessage = imageMessage;
                    else headerFields.imageMessage = { url: typeof card.image === 'string' ? card.image : card.image.url };
                } else {
                    headerFields.imageMessage = { url: typeof card.image === 'string' ? card.image : card.image.url };
                }
            } catch (err) {
                headerFields.imageMessage = { url: typeof card.image === 'string' ? card.image : card.image.url };
            }
        } else if (card.video) {
            headerFields.hasMediaAttachment = true;
            try {
                const media = await utils.fetchMediaBuffer(card.video);
                if (this.client?.waUploadToServer && media) {
                    const { videoMessage } = await generateWAMessageContent(
                        { video: media },
                        { upload: this.client.waUploadToServer }
                    );
                    if (videoMessage) headerFields.videoMessage = videoMessage;
                    else headerFields.videoMessage = { url: typeof card.video === 'string' ? card.video : card.video.url };
                } else {
                    headerFields.videoMessage = { url: typeof card.video === 'string' ? card.video : card.video.url };
                }
            } catch (err) {
                headerFields.videoMessage = { url: typeof card.video === 'string' ? card.video : card.video.url };
            }
        }
        if (card.title) headerFields.title = card.title;

        const cardButtons = (card.buttons || []).map((btn) => {
            if (btn.name && btn.buttonParamsJson) return btn;
            const name = btn.name || (btn.url ? 'cta_url' : btn.copyCode ? 'cta_copy' : btn.phone ? 'cta_call' : 'quick_reply');
            let params = {};
            if (name === 'cta_url') params = { display_text: btn.displayText || btn.text || '', url: btn.url };
            else if (name === 'cta_copy') params = { display_text: btn.displayText || btn.text || 'Copy', copy_code: btn.copyCode || btn.code };
            else if (name === 'cta_call') params = { display_text: btn.displayText || btn.text || 'Call', phone_number: btn.phoneNumber || btn.phone };
            else params = { display_text: btn.displayText || btn.text || '', id: btn.id || btn.buttonId || '' };

            return { name, buttonParamsJson: JSON.stringify(params) };
        });

        return proto.Message.InteractiveMessage.create({
            header: proto.Message.InteractiveMessage.Header.create(headerFields),
            body: proto.Message.InteractiveMessage.Body.create({
                text: typeof card.body === 'string' ? card.body : (card.body?.text || ''),
            }),
            footer: proto.Message.InteractiveMessage.Footer.create({
                text: typeof card.footer === 'string' ? card.footer : (card.footer?.text || ''),
            }),
            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                buttons: cardButtons,
            }),
        });
    }));

    const interactiveContent = proto.Message.InteractiveMessage.create({
        header: proto.Message.InteractiveMessage.Header.create({
            title: carouselData.title || content.title || '',
            hasMediaAttachment: false,
        }),
        body: proto.Message.InteractiveMessage.Body.create({ text: carouselData.text || content.text || content.caption || '' }),
        ...(carouselData.footer || content.footer ? {
            footer: proto.Message.InteractiveMessage.Footer.create({ text: carouselData.footer || content.footer }),
        } : {}),
        carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.create({
            cards: mappedCards,
            messageVersion: 1,
        }),
    });

    return await utils.relayInteractive(this.client, targetJid, interactiveContent, {
        quoted,
        badge: content.badge !== false && carouselData.badge !== false,
        mentions: content.mentions || [],
        nonJidMentions: content.nonJidMentions || 0,
    });
}

export async function handleQuickReply(content, jid, quoted) {
    const targetJid = this._resolveJid(jid, quoted);
    const data = content.quickReplyButtons || content;
    const buttons = data.buttons || [];
    const nativeButtons = buttons.map((btn) => ({
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({ display_text: btn.displayText || btn.text || '', id: btn.id || btn.buttonId || '' }),
    }));

    const interactiveContent = proto.Message.InteractiveMessage.create({
        header: proto.Message.InteractiveMessage.Header.create({
            title: data.title || content.title || '',
            hasMediaAttachment: false,
        }),
        body: proto.Message.InteractiveMessage.Body.create({ text: data.text || content.text || content.caption || '' }),
        footer: proto.Message.InteractiveMessage.Footer.create({ text: data.footer || content.footer || '' }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
            buttons: nativeButtons,
        }),
    });

    return await utils.relayInteractive(this.client, targetJid, interactiveContent, {
        quoted,
        badge: content.badge !== false,
        mentions: content.mentions || [],
        nonJidMentions: content.nonJidMentions || 0,
    });
}

export async function handleUrlButtons(content, jid, quoted) {
    const targetJid = this._resolveJid(jid, quoted);
    const data = content.urlButtons || content;
    const buttons = data.buttons || [];
    const nativeButtons = buttons.map((btn) => ({
        name: 'cta_url',
        buttonParamsJson: JSON.stringify({
            display_text: btn.displayText || btn.text || '',
            url: btn.url,
            ...(btn.merchantUrl ? { merchant_url: btn.merchantUrl } : {}),
        }),
    }));

    const interactiveContent = proto.Message.InteractiveMessage.create({
        header: proto.Message.InteractiveMessage.Header.create({
            title: data.title || content.title || '',
            hasMediaAttachment: false,
        }),
        body: proto.Message.InteractiveMessage.Body.create({ text: data.text || content.text || content.caption || '' }),
        footer: proto.Message.InteractiveMessage.Footer.create({ text: data.footer || content.footer || '' }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
            buttons: nativeButtons,
        }),
    });

    return await utils.relayInteractive(this.client, targetJid, interactiveContent, {
        quoted,
        badge: content.badge !== false,
        mentions: content.mentions || [],
        nonJidMentions: content.nonJidMentions || 0,
    });
}

export async function handleCopyCode(content, jid, quoted) {
    const targetJid = this._resolveJid(jid, quoted);
    const data = content.copyCode || content.copyCodeButtons || content;
    const copyCode = data.code || data.copyCode;
    const displayText = data.displayText || data.text || 'Copy Code';

    const interactiveContent = proto.Message.InteractiveMessage.create({
        header: proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false }),
        body: proto.Message.InteractiveMessage.Body.create({ text: data.body || data.text || content.text || '' }),
        footer: proto.Message.InteractiveMessage.Footer.create({ text: data.footer || content.footer || '' }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
            buttons: [{
                name: 'cta_copy',
                buttonParamsJson: JSON.stringify({ display_text: displayText, copy_code: copyCode }),
            }],
        }),
    });

    return await utils.relayInteractive(this.client, targetJid, interactiveContent, {
        quoted,
        badge: content.badge !== false,
        mentions: content.mentions || [],
        nonJidMentions: content.nonJidMentions || 0,
    });
}

export async function handleCombinedButtons(content, jid, quoted) {
    const targetJid = this._resolveJid(jid, quoted);
    const data = content.combinedButtons || content;
    const buttons = data.buttons || [];
    const nativeButtons = buttons.map((btn) => {
        switch (btn.type) {
            case 'url':
                return { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: btn.displayText || btn.text, url: btn.url }) };
            case 'reply':
                return { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: btn.displayText || btn.text, id: btn.id }) };
            case 'copy':
                return { name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: btn.displayText || btn.text, copy_code: btn.copyCode || btn.code }) };
            case 'call':
                return { name: 'cta_call', buttonParamsJson: JSON.stringify({ display_text: btn.displayText || btn.text, phone_number: btn.phoneNumber || btn.phone }) };
            default:
                return { name: btn.type || btn.name || 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: btn.displayText || btn.text }) };
        }
    });

    const interactiveContent = proto.Message.InteractiveMessage.create({
        header: proto.Message.InteractiveMessage.Header.create({
            title: data.title || content.title || '',
            hasMediaAttachment: false,
        }),
        body: proto.Message.InteractiveMessage.Body.create({ text: data.text || content.text || content.caption || '' }),
        footer: proto.Message.InteractiveMessage.Footer.create({ text: data.footer || content.footer || '' }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
            buttons: nativeButtons,
        }),
    });

    return await utils.relayInteractive(this.client, targetJid, interactiveContent, {
        quoted,
        badge: content.badge !== false,
        mentions: content.mentions || [],
        nonJidMentions: content.nonJidMentions || 0,
    });
}
