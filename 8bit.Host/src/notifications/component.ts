import { HIDE_NOTIFICATION_EVENT, SHOW_NOTIFICATION_EVENT } from '../events';
import { Component, html, wait } from '../global';
import { share } from '../global/share';
import { INotification } from './INotification';

import css from './component.css';

@Component({
    css
})
export class ANotificationsComponent extends HTMLElement implements IComponent {

    connectedCallback() {

        window.addEventListener(SHOW_NOTIFICATION_EVENT, this.onShowNotification);
        window.addEventListener(HIDE_NOTIFICATION_EVENT, this.onHideNotification);
    }

    disconnectedCallback() {

        window.removeEventListener(SHOW_NOTIFICATION_EVENT, this.onShowNotification);
        window.removeEventListener(HIDE_NOTIFICATION_EVENT, this.onHideNotification);
    }

    onShowNotification = (e: Event) => { this.showNotification((e as CustomEvent<INotification>).detail); };
    onHideNotification = (e: Event) => { this.hideNotification((e as CustomEvent<string>).detail); };

    notifications: { [id: string]: INotification } = {};
    showNotification(notification: INotification) {
        const element = document.createElement('div');
        element.dataset.id = notification.id;
        element.classList.add('notification');
        if (notification.modal) element.classList.add('modal');
        if (notification.style) Object.assign(element.style, notification.style);

        const showShare = !!notification.share && !!navigator.share;

        html`
            <div class="content">
                ${(notification.title || notification.allowClose) && html`
                    <section class="header">
                        <div class="title">${notification.title}</div>
                        ${notification.allowClose && html`<div class="close">&times;</div>`}
                        ${showShare && html`<button class="share not-shared"><a-icon type="share" /></button>`}
                    </section>
                `}
                ${notification.body && html`
                    <section class="body">
                        ${notification.body}
                    </section>
                `}
                ${notification.footer && html`
                    <section class="footer">
                        ${notification.footer}
                    </section>
                `}
            </div>
        `.render(element)
            .then(() => {

                const closeElement = element.querySelector('.close');
                if (closeElement)
                    closeElement.addEventListener('click',
                        () => { this.hideNotification(notification.id!); }
                    );

                const shareElement = element.querySelector('.share');
                if (shareElement)
                    shareElement.addEventListener('click',
                        () => { share(notification.share!.text, element); }
                    );

                wait(50).then(() => element.classList.add('shown'));

            });

        this.shadowRoot!.appendChild(element);

    }

    hideNotification(id: string) {

        const element = this.shadowRoot!.querySelector(`[data-id="${id}"]`);
        if (!element) return;

        element.classList.remove('shown');
        element.addEventListener('transitionend', () => { element.remove(); }, { once: true });
    }
}
