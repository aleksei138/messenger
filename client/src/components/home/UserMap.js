exports.UserMap = class UserMap {
    static async init() {
        if (this.array && this.array.length > 0)
            return;
        const response = await fetch('api/chats/loadContacts');
        const data = await response.json();
        if (response.ok) {
            let map = {};
            data.forEach(element => {
                map[element.id] = {
                    fullName: element.firstName + ' ' + element.lastName, 
                    firstName: element.firstName, 
                    lastName: element.lastName,
                    avatarLetters: element.firstName[0] + element.lastName[0]
                };
            });
            this.map = map;
        }
        
    }

    static get(id) {
        return this.map[id];
    }
}
