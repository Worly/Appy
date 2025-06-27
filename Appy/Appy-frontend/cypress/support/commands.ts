// ***********************************************
// This example namespace declaration will help
// with Intellisense and code completion in your
// IDE or Text Editor.
// ***********************************************
// declare namespace Cypress {
//   interface Chainable<Subject = any> {
//     customCommand(param: any): typeof customCommand;
//   }
// }
//
// function customCommand(param: any): void {
//   console.warn(param);
// }
//
// NOTE: You can use it like so:
// Cypress.Commands.add('customCommand', customCommand);
//
// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

import { appConfig } from "src/app/app.config";

export function getElement(dataTestAttr: string) {
    return cy.get(`[data-test=${dataTestAttr}]`).should("have.length", 1);
}

export function getElements(dataTestAttr: string) {
    return cy.get(`[data-test=${dataTestAttr}]`).should("have.length.greaterThan", 0);
}

export function login(user: string) {
    cy.session(["login-user", user], () => {
        cy.visit("/login");

        getElement("email-input").type(`${user}@e2e.com`);
        getElement("password-input").type(user);
        getElement("login-button").click();

        expectURL(appConfig.homePage);
    }, {
        validate: () => {
            cy.visit("/");

            expectURL(appConfig.homePage);
        }
    })
}

export function expectURL(url: RegExp | string) {
    if (typeof(url) == "string") {
        url = new RegExp(url);
    }

    expectURLs(url);
}

export function expectURLs(...url: RegExp[]) {
    for (let i = 0; i < url.length; i++) {
        if (url[i].source.startsWith("\\/")) {
            url[i] = new RegExp(url[i].source.substring(2));
        }
    }

    cy.url().should(currentUrl => {
        if (currentUrl.includes("?")) {
            currentUrl = currentUrl.split("?")[0];
        }

        if (currentUrl.indexOf(Cypress.config().baseUrl!) == -1) {
            throw new Error("Current url should start with baseUrl")
        }

        currentUrl = currentUrl.slice(Cypress.config().baseUrl!.length);

        let found = false;
        for (let i = 0; i < url.length; i++) {
            if (currentUrl.match(url[i])) {
                found = true;
                break;
            }
        }

        expect(found).to.equal(true, `Expected ${currentUrl} to be one of ${url}`);
    })
}