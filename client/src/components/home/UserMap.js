exports.UserMap = class UserMap {
    constructor() {
        this.map = {};
        this.array = [];
    }
    static init() {
        if (this.array && this.array.length > 0)
            return;
        fetch('api/chats/loadContacts').then((response) => {
            if (!response.ok)
                throw new Error();
            return response.json();
        }).then((data) => {
            this.array = data;
            let map = {};
            this.array.forEach(element => {
                map[element.id] = {fullName: element.firstName + ' ' + element.lastName, firstName: element.firstName, lastName: element.lastName };
            });
            this.map = map;
            this.array = data;
        }).catch((error) => {
            console.error(error);
        });
    }

    static get(id) {
        return this.map[id];
    }

    static getFullArray() {
        return this.array;
    }
}
