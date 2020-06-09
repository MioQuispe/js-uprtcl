import { html, css, property } from 'lit-element';
import { EveesInfoBase } from './evee-info-base';
import { DEFAULT_COLOR } from './support';

const styleMap = (style) => {
  return Object.entries(style).reduce((styleString, [propName, propValue]) => {
    propName = propName.replace(
      /([A-Z])/g,
      (matches) => `-${matches[0].toLowerCase()}`
    );
    return `${styleString}${propName}:${propValue};`;
  }, '');
};

export class EveesInfoPopper extends EveesInfoBase {
  @property({ attribute: false })
  show: Boolean = false;

  firstUpdated() {
    super.firstUpdated();
  }

  showClicked() {
    this.show = !this.show;
    if (this.show) this.load();
  }

  async newPerspectiveClicked() {
    super.newPerspectiveClicked();
    this.show = false;
  }

  perspectiveTitle() {
    if (this.ref === this.firstRef) {
      return 'Accepted Perspective (on the parent)';
    } else {
      return `Another Perspective`;
    }
  }

  renderOtherPerspectives() {
    return html`
      <div class="perspectives-list">
        <evees-perspectives-list
          perspective-id=${this.ref}
          first-perspective-id=${this.firstRef}
          @perspective-selected=${(e) => this.checkoutPerspective(e.detail.id)}
          @merge-perspective=${(e) =>
            this.otherPerspectiveMerge(e.detail.perspectiveId, this.ref, false)}
          @create-proposal=${(e) =>
            this.otherPerspectiveMerge(e.detail.perspectiveId, this.ref, true)}
          @authorize-proposal=${this.authorizeProposal}
          @execute-proposal=${this.executeProposal}
        ></evees-perspectives-list>
      </div>
      <div class="button-row">
        ${this.loading
          ? this.renderLoading()
          : html`
              <mwc-button
                icon="call_split"
                @click=${this.newPerspectiveClicked}
                label="new perspective"
              ></mwc-button>
            `}
      </div>
    `;
  }

  renderPermissions() {
    return html`
      <div class="perspectives-permissions">
        <permissions-for-entity ref=${this.ref}></permissions-for-entity>
      </div>
    `;
  }

  render() {
    return html`
      <div class="container">
        <div class="button" @click=${this.showClicked}>
          <div
            class="evee-stripe"
            style=${styleMap({
              backgroundColor:
                (this.eveeColor ? this.eveeColor : DEFAULT_COLOR) + 'FF',
            })}
          ></div>
        </div>

        ${this.show
          ? html`
              <mwc-card class="info-box">
                ${this.perspectiveData
                  ? html`
                      <div class="column">
                        ${this.renderInfo()}

                        <div class="close">
                          <mwc-icon-button
                            icon="close"
                            @click=${this.showClicked}
                          ></mwc-icon-button>
                        </div>
                      </div>
                    `
                  : ''}
              </mwc-card>
            `
          : ''}
      </div>
    `;
  }

  static get styles() {
    return super.styles.concat([
      css`
        .container {
          position: relative;
          height: 100%;
        }
        .button {
          cursor: pointer;
          padding-top: 5px;
          padding-left: 10px;
          padding-right: 10px;
          height: 100%;
          border-radius: 3px;
          user-select: none;
          transition: background-color 100ms linear;
        }
        .button:hover {
          background-color: #eef1f1;
        }
        .evee-stripe {
          width: 10px;
          height: calc(100% - 10px);
          border-radius: 3px;
        }
        .info-box {
          width: auto;
          z-index: 20;
          position: absolute;
          left: 30px;
          top: 0;
          width: 80vw;
          max-width: 700px;
        }
        .tab-content-container {
          min-height: 400px;
          display: flex;
          flex-direction: column;
        }
        .tab-content {
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }
        .color-bar {
          height: 1vw;
          max-height: 5px;
          width: 100%;
          margin-bottom: 1vw;
          border-top-right-radius: 4px;
          border-top-left-radius: 4px;
        }
        .perspective-title {
          font-weight: bold;
          padding: 0.5vw 0 1.5vw 1.5vw;
        }
        .button-row {
          padding-bottom: 16px;
          text-align: center;
        }
        .perspectives-list {
          flex-grow: 1;
        }
        .close {
          position: absolute;
          top: 20px;
          right: 20px;
        }
      `,
    ]);
  }
}
