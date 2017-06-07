/**
 * This file abstracts all interactions with the TrueVault API. Don't get attached! The TrueVault team will release
 * a JavaScript SDK in the future that will encapsulate this functionality in a more upgradable way.
 * We don't recommend copying this into your app and going to production with this snapshot. Instead, use this to get
 * started but grab our official SDK when it's released.
 * @param path
 * @param options
 * @returns {Promise.<*>}
 */
async function performRequest(path, options) {
    const response = await fetch(`https://api.truevault.com/v1/${path}`, options);
    const responseBody = await response.text();

    let json;
    try {
        json = JSON.parse(responseBody);
    } catch (e) {
        throw new Error(`non-JSON response: ${responseBody}`)
    }

    if (json.result === 'error') {
        let error = new Error(json.error.message);
        error.error = json.error;
        throw error;
    } else {
        return json;
    }
}

module.exports = {
    login: (accountId, username, password, mfaCode) => {
        let formData = new FormData();
        formData.append("account_id", accountId);
        formData.append("username", username);
        formData.append("password", password);
        formData.append("mfa_code", mfaCode);

        return performRequest(`auth/login`, {
            method: 'POST',
            body: formData
        }).then(response => response.user);
    },

    listUsers: (accessToken) => {
        const headers = {
            Authorization: `Basic ${btoa(accessToken + ':')}`
        };

        return performRequest('users?full=true', {
            method: 'GET',
            headers: headers
        }).then(response => {
            return response.users.map(user => {
                if (user.attributes) {
                    user.attributes = JSON.parse(atob(user.attributes));
                }
                return user;
            });
        });

    },

    readCurrentUser: (accessToken) => {
        const headers = {
            Authorization: `Basic ${btoa(accessToken + ':')}`
        };

        return performRequest('auth/me?full=true', {
            method: 'GET',
            headers: headers
        }).then(response => {
            let user = response.user;
            if (user.attributes === null) {
                user.attributes = {};
            } else {
                user.attributes = JSON.parse(atob(user.attributes));
            }
            return user;
        });
    },

    createDocument: (accessToken, vaultId, schemaId, document) => {
        let formData = new FormData();
        formData.append("document", btoa(JSON.stringify(document)));

        if (schemaId) {
            formData.append("schema_id", schemaId);
        }

        const headers = {
            Authorization: `Basic ${btoa(accessToken + ':')}`
        };

        return performRequest(`vaults/${vaultId}/documents`, {
            method: 'POST',
            headers: headers,
            body: formData
        });
    },

    updateDocument: (accessToken, vaultId, documentId, document) => {
        let formData = new FormData();
        formData.append("document", btoa(JSON.stringify(document)));

        const headers = {
            Authorization: `Basic ${btoa(accessToken + ':')}`
        };

        return performRequest(`vaults/${vaultId}/documents/${documentId}`, {
            method: 'PUT',
            headers: headers,
            body: formData
        });
    },

    search: (accessToken, vaultId, searchOption) => {
        let formData = new FormData();
        formData.append("search_option", btoa(JSON.stringify(searchOption)));

        const headers = {
            Authorization: `Basic ${btoa(accessToken + ':')}`
        };

        return performRequest(`vaults/${vaultId}/search`, {
            method: 'POST',
            headers: headers,
            body: formData
        });
    },

    createVault: (accessToken, name) => {
        let formData = new FormData();
        formData.append("name", name);

        const headers = {
            Authorization: `Basic ${btoa(accessToken + ':')}`
        };

        return performRequest('vaults', {
            method: 'POST',
            headers: headers,
            body: formData
        });
    },

    createUser: (accessToken, username, password, attributes) => {
        let formData = new FormData();
        formData.append("username", username);
        formData.append("password", password);
        if (attributes) {
            formData.append("attributes", btoa(JSON.stringify(attributes)));
        }

        const headers = {
            Authorization: `Basic ${btoa(accessToken + ':')}`
        };

        return performRequest('users', {
            method: 'POST',
            headers: headers,
            body: formData
        }).then(response => response.user);
    },

    updateUserPassword: async (accessToken, userId, newPassword) => {
        let formData = new FormData();
        formData.append("password", newPassword);

        const headers = {
            Authorization: `Basic ${btoa(accessToken + ':')}`
        };

        const response = await performRequest(`users/${userId}`, {
            method: 'PUT',
            headers: headers,
            body: formData
        });
        return response.user;
    },

    createUserAPIKey: async (apiKey, userId) => {
        const headers = {
            Authorization: `Basic ${btoa(apiKey + ':')}`
        };

        const response = await performRequest(`users/${userId}/api_key`, {
            method: 'POST',
            headers: headers
        });
        return response.api_key;
    },

    createAccessToken: async (accessToken, userId) => {
        const headers = {
            Authorization: `Basic ${btoa(accessToken + ':')}`
        };

        const response = await performRequest(`users/${userId}/access_token`, {
            method: 'POST',
            headers: headers
        });
        return response.user.access_token;
    },

    createGroup: async (accessToken, name, policy, userIds) => {
        let formData = new FormData();
        formData.append("name", name);
        formData.append("policy", btoa(JSON.stringify(policy)));
        if (!!userIds) {
            formData.append("user_ids", userIds.join(','));
        }

        const headers = {
            Authorization: `Basic ${btoa(accessToken + ':')}`
        };

        const response = await performRequest('groups', {
            method: 'POST',
            headers: headers,
            body: formData
        });
        return response.group;
    },

    addUsersToGroup: (accessToken, groupId, userIds) => {
        const headers = {
            Authorization: `Basic ${btoa(accessToken + ':')}`,
            'Content-Type': 'application/json'
        };

        return performRequest(`groups/${groupId}/membership`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({user_ids: userIds})
        });
    },

    createSchema: (accessToken, vaultId, name, fields) => {
        const schemaDefinition = {name, fields};
        const formData = new FormData();
        formData.append("schema", btoa(JSON.stringify(schemaDefinition)));

        const headers = {
            Authorization: `Basic ${btoa(accessToken + ':')}`
        };

        return performRequest(`vaults/${vaultId}/schemas`, {
            method: 'POST',
            headers: headers,
            body: formData
        });
    },

    getDocuments: (accessToken, vaultId, documentIds) => {
        const headers = {
            Authorization: `Basic ${btoa(accessToken + ':')}`
        };

        return performRequest(`vaults/${vaultId}/documents/${documentIds.join(',')}`, {
            headers: headers
        })
            .then(response => response.documents.map(doc => {
                doc.document = JSON.parse(atob(doc.document));
                return doc;
            }));
    },

    getDocument: (accessToken, vaultId, documentId) => {
        const headers = {
            Authorization: `Basic ${btoa(accessToken + ':')}`
        };

        return fetch(`https://api.truevault.com/v1/vaults/${vaultId}/documents/${documentId}`, {
            headers: headers
        })
            .then(response => response.text())
            .then(body => JSON.parse(atob(body)));
    },

    createBlob: (accessToken, vaultId, file) => {
        const formData = new FormData();
        formData.append('file', file);

        const headers = {
            Authorization: `Basic ${btoa(accessToken + ':')}`,
        };

        return performRequest(`vaults/${vaultId}/blobs`, {
            method: 'POST',
            headers: headers,
            body: formData
        });
    },

    createBlobWithProgress: (accessToken, vaultId, file, progressCallback) => {
        // We are using XMLHttpRequest here since fetch does not have a progress API
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            const formData = new FormData();
            formData.append('file', file);

            xhr.upload.addEventListener('progress', progressCallback);
            xhr.upload.addEventListener('load', progressCallback);
            xhr.open('post', `https://api.truevault.com/v1/vaults/${vaultId}/blobs`);
            xhr.setRequestHeader('Authorization', `Basic ${btoa(accessToken + ':')}`);
            xhr.onload = () => {
                let responseJson = JSON.parse(xhr.responseText);
                if (responseJson.result === 'error') {
                    let error = new Error(responseJson.error.message);
                    error.error = responseJson.error;
                    reject(error);
                } else {
                    resolve(responseJson);
                }
            };
            xhr.onerror = () => reject(Error('Network error'));
            xhr.send(formData);
        })
    },

    getBlob: (accessToken, vaultId, blobId) => {
        const headers = {
            Authorization: `Basic ${btoa(accessToken + ':')}`
        };

        return fetch(`https://api.truevault.com/v1/vaults/${vaultId}/blobs/${blobId}`, {
            headers: headers
        })
            .then(response => response.blob())
    },

    sendEmailSendgrid: async (accessToken, sendgridApiKey, userId, sendgridTemplateId, fromEmailSpecifier, toEmailSpecifier, substitutions) => {
        const headers = {
            Authorization: `Basic ${btoa(accessToken + ':')}`,
            'Content-Type': 'application/json'
        };

        const response = await performRequest(`users/${userId}/message/email`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                provider: 'SENDGRID',
                auth: {sendgrid_api_key: sendgridApiKey},
                template_id: sendgridTemplateId,
                from_email_address: fromEmailSpecifier,
                to_email_address: toEmailSpecifier,
                substitutions
            })
        });
        return response.provider_message_id;
    }
};
