/**
 * This builder object provides a convenient DSL for generating [TrueVault group policies](https://docs.truevault.com/groups).
 * It allows writing code like `new GroupPolicyBuilder.read('User::.*')` rather than having to assemble TrueVault group policy
 * JSON manually.
 */
class GroupPolicyBuilder {

    constructor () {
        this.activitiesToResources = {
            C: [],
            R: [],
            U: [],
            D: []
        }
    }

    create (...resourceStrings) {
        this.activitiesToResources.C = this.activitiesToResources.C.concat(resourceStrings);
        return this;
    }

    read (...resourceStrings) {
        this.activitiesToResources.R = this.activitiesToResources.R.concat(resourceStrings);
        return this;
    }

    update (...resourceStrings) {
        this.activitiesToResources.U = this.activitiesToResources.U.concat(resourceStrings);
        return this;
    }

    delete (...resourceStrings) {
        this.activitiesToResources.D = this.activitiesToResources.D.concat(resourceStrings);
        return this;
    }

    build() {
        let policy = [];
        Object.keys(this.activitiesToResources).forEach(key => {
            if (this.activitiesToResources[key].length > 0) {
                policy = policy.concat({
                    Activities: key,
                    Resources: this.activitiesToResources[key]
                });
            }
        });
        return policy;
    }
}

module.exports = GroupPolicyBuilder;
