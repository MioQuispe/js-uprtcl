import { html, css, property, query } from 'lit-element';
export const styleMap = style => {
  return Object.entries(style).reduce((styleString, [propName, propValue]) => {
    propName = propName.replace(/([A-Z])/g, matches => `-${matches[0].toLowerCase()}`);
    return `${styleString}${propName}:${propValue};`;
  }, '');
};

import { EveesInfoBase } from './evee-info-base';
import { prettyAddress } from './support';
import { UPDATE_HEAD } from 'src/graphql/queries';
import { ApolloClient } from 'apollo-boost';
import { MenuConfig } from './common-ui/evees-options-menu';

import "@material/mwc-dialog";

export class EveesInfoPage extends EveesInfoBase {

  @property({type: Boolean, attribute: false})
  showEditName: boolean = false;

  firstUpdated() {
    super.firstUpdated();
  }

  connectedCallback() {
    super.connectedCallback();

    this.addEventListener('keydown', (event) => {
      if (event.keyCode === 27) {
        // 27 is esc
        this.showEditName = false;
      }

      if (event.keyCode === 13) {
        // 13 is enter
        if (this.showEditName) {
          this.saveName();
        }
      }
    })


  }

  perspectiveTitle() {
    if (!this.perspectiveData) return this.perspectiveId;

    if (this.perspectiveId === this.firstPerspectiveId) {
      return html`<span>Official Version</span>`;
    } 

    const hasName = this.perspectiveData.details.name !== undefined && this.perspectiveData.details.name !== '';
    const name = html`${this.perspectiveData.details.name}`;
    const defaultName = html`by ${prettyAddress(this.perspectiveData.perspective.creatorId)}`;

    return html`Draft ${hasName ? name : defaultName}`;
  }

  async editNameClicked() {
    this.showEditName = true;
  }

  async saveName() {
    if (!this.shadowRoot) return;
    const client = this.client as ApolloClient<any>
    const input = this.shadowRoot.getElementById('DRAFT_NAME') as any;
    const newName = input.value;

    this.showEditName = false;

    await client.mutate({
      mutation: UPDATE_HEAD,
      variables: {
        perspectiveId: this.perspectiveId,
        name: newName
      }
    });

    this.load();    
  }

  optionClicked(e) {
    switch (e.detail.key) {
      case 'logout':
        this.logout();
        break;
        
      case 'login':
        this.login();
        break;
      
      case 'edit':
        this.editNameClicked();
        break;
    }
  }

  renderOtherPerspectives() {
    return html`
      <evees-perspectives-list
        force-update=${this.forceUpdate}
        perspective-id=${this.perspectiveId}
        first-perspective-id=${this.firstPerspectiveId}
        @perspective-selected=${(e) => this.otherPerspectiveClicked(e.detail.id)}
        @merge-perspective=${e => this.otherPerspectiveMerge(e.detail.perspectiveId, this.perspectiveId, false)}
        @create-proposal=${e => this.otherPerspectiveMerge(e.detail.perspectiveId, this.perspectiveId, true)}
        @authorize-proposal=${this.authorizeProposal}
        @execute-proposal=${this.executeProposal}
      ></evees-perspectives-list>
    `;
  }

  renderPermissions() {
    return html`
      <div class="perspectives-permissions">
        <permissions-for-entity 
          ref=${this.perspectiveId}>
        </permissions-for-entity>
      </div>
    `;
  }

  renderEditNameForm() {
    return html`
      <div>
        <div class="row">
          <mwc-textfield
            outlined
            id="DRAFT_NAME"
            value=${this.perspectiveData.details.name as string} 
            label="Draft Name">
          </mwc-textfield>
        </div>
        <div class="row">
          <mwc-button
            outlined
            icon="clear"
            @click=${() => this.showEditName = false}
            label="Cancel"
          ></mwc-button>
          <mwc-button
            outlined
            icon="done"
            @click=${this.saveName}
            label="Save"
          ></mwc-button>
        </div>
      </div>`;
  }

  renderPerspectiveActions() {
    /** most likely action button */
    const actionButton = html`
      <div class="action-button">    
        ${this.firstPerspectiveId !== this.perspectiveId ? (
          this.publicRead ? html`
            <mwc-button outlined
              icon="call_merge"
              @click=${this.proposeMergeClicked}
              label="Propose Update"
            ></mwc-button>` : html`
            <mwc-button outlined
              icon=${this.publicRead ? "visibility_off" : "visibility"}
              @click=${this.makePublic}
              label="Make Public"
            ></mwc-button>`
        ) : (this.isLogged ? 
          html`
            <mwc-button outlined
              icon="call_split"
              @click=${this.newPerspectiveClicked}
              label="new draft"
            ></mwc-button>` : html`
            <mwc-button outlined
              icon="account_box"
              @click=${this.login}
              label="login"
            ></mwc-button>`)
          }
      </div>`;

    const contextConfig: MenuConfig = {};

    if (this.perspectiveData.canWrite) {
      contextConfig['edit'] = {
        disabled: false,
        graphic: 'edit',
        text: 'edit'
      }
    }

    if (this.isLogged) {
      contextConfig['logout'] = {
        disabled: false,
        graphic: 'exit_to_app',
        text: 'logout'
      }
    } else {
      contextConfig['login'] = {
        disabled: false,
        graphic: 'account_box',
        text: 'login'
      }
    }
    
    const contextButton = html`
      <div class="context-menu">
          <evees-help>
            <span>
              To update the "Official Version" of this Wiki you need to create a new "Draft"<br><br>
              Once changes have been made to the draft, you can "Propose an Update" to the "Official Version".            
            </span>
          </evees-help>
          <evees-options-menu 
            .config=${contextConfig} 
            @option-click=${this.optionClicked}>
          </evees-options-menu>          
      </div>
    `;

    return html`
      ${this.showEditName ? '' : actionButton}
      ${contextButton}
      `;
  }

  render() {
    if (this.perspectiveData === undefined) return html``;
    return html`
      <div class="container">
        <div class="column">
          <div class="section">
            
            <div class="section-header">
              ${this.perspectiveTitle()}
            </div>

            <div class="section-content">
              ${this.showEditName ? this.renderEditNameForm() : ''}
              ${this.renderPerspectiveActions()}
              <div class="other-perspectives">
                ${this.renderOtherPerspectives()}
              </div>
            </div>

          </div>

          <div class="section">
            <div class="section-header">
              Access Control
            </div>
            <div class="section-content">
              ${this.renderPermissions()}
            </div>
            <div class="context-menu">
              <evees-help>
                <span>
                  Drafts can be made public to let others read them.<br><br>
                  They can only be edited by their creator.
                </span>
              </evees-help>
            </div>
          </div>

          ${this.perspectiveData.canWrite ? html`
            <div class="section">
              <div class="section-header">
                Delete
              </div>
              <div class="section-content">
                <mwc-button
                  outlined
                  class="bottom-button"
                  icon="delete_forever"
                  @click=${() => this.delete()}
                  label="Delete"
                ></mwc-button>
              </div>
            </div>` : ''}

          <!-- <div class="section">
            <div class="section-header">
              Evee Info
            </div>
            <div class="section-content info-text">
              ${this.renderInfo()}
            </div>
          </div> -->
          

        </div>
      </div>
      ${this.showUpdatesDialog ? this.renderUpdatesDialog() : ''}`;
  }

  static get styles() {
    return super.styles.concat([css`

      mwc-button {
        width: 220px;
      }

      p {
        margin: 0;
      }
      .column {
        display: flex;
        flex-direction: column;
        padding: 0px 5vw;
      }
      .section {
        text-align: center;
        width: 100%;
        max-width: 700px;
        margin: 0 auto;
        box-shadow: 0px 0px 4px 0px rgba(0, 0, 0, 0.2);
        margin-bottom: 36px;
        border-radius: 4px;
        background-color: rgb(255,255,255,0.6);
        position: relative;
      }
      .section-content {
        padding-top: 3vw;
      }
      .section-header {
        font-weight: bold;
        padding: 2vw 0px 0.8vw 0px; 
        font-size: 1.6em;
        border-style: solid 2px;
      }
      .edit-btn {
        position: absolute;
        top: 20px;
        right: 20px;
      }
      .row mwc-textfield{
        margin: 0px 0px 24px 0px;
      }
      .perspective-header {
        border-top-style: solid;
        border-top-width: 5px;
      }
      .context-menu {
        position: absolute;
        top: 6px;
        right: 6px;
        display: flex;
      }
      .section-content {
        padding: 2.2vw 0px 2.2vw 0px;
      }
      .info-text {
        color: #4e585c;
        padding: 0px 2.5vw;
        min-height: 75px;
      }
      .action-button {
        margin-bottom: 32px;
      }
      .other-perspectives {
        border-top: solid 1px #cccccc;
        margin-top: 1.8vw;
        min-height: 200px;
        display: flex;
        flex-direction: column;
      }
    `]);
  }
}
