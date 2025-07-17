new Vue({
    el: '#app',
    data: {
        isAuthenticated: false,
        username: '',
        userRole: '',
        fullName: '',
        userId: null,
        currentView: 'login', // 'login', 'createTicket', 'myTickets', 'allTickets', 'ticketDetails', 'users'

        loginForm: {
            username: '',
            password: ''
        },
        loginError: '',

        newTicket: {
            department_id: '',
            issue_type_id: '',
            subject: '',
            description: '',
            urgency: 'Medium'
        },
        ticketMessage: '',
        ticketSuccess: false,

        myTickets: [],
        allTickets: [],
        departments: [],
        issueTypes: [],
        users: [],
        itUsers: [], // subset of users with 'admin' role for assignment
        selectedTicket: null,

        filters: {
            status: '',
            department_id: '',
            issue_type_id: '',
            search: ''
        },

        updateTicketForm: {
            status: '',
            assigned_to_id: null,
            resolution_notes: ''
        },
        updateTicketMessage: '',
        updateTicketSuccess: false,

        newCommentText: '',
        commentMessage: '',
        commentSuccess: false,

        userUpdateMessage: {}, // Stores messages per user ID
        userUpdateSuccess: {}, // Stores success status per user ID
    },
    methods: {
        async fetchAuthStatus() {
            try {
                // Using 'credentials: "include"' is crucial for sending cookies (session)
                const response = await fetch('http://127.0.0.1:5000/api/auth/me', { credentials: 'include' });
                if (response.ok) {
                    const data = await response.json();
                    this.isAuthenticated = true;
                    this.username = data.username;
                    this.userRole = data.role;
                    this.fullName = data.full_name;
                    this.userId = data.id;
                    this.loadInitialData(); // Load data relevant to the logged-in user
                    if (this.userRole === 'admin') {
                         this.currentView = 'allTickets';
                    } else {
                         this.currentView = 'myTickets';
                    }
                } else {
                    this.isAuthenticated = false;
                    this.currentView = 'login';
                    this.loginError = ''; // Clear any previous error
                }
            } catch (error) {
                console.error('Error fetching auth status:', error);
                this.isAuthenticated = false;
                this.currentView = 'login';
                this.loginError = 'Could not connect to the server.';
            }
        },
        async handleLogin() {
            try {
                const response = await fetch('http://127.0.0.1:5000/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(this.loginForm),
                    credentials: 'include'
                });
                const data = await response.json();
                if (response.ok) {
                    this.isAuthenticated = true;
                    this.username = data.user.username;
                    this.userRole = data.user.role;
                    this.fullName = data.user.full_name;
                    this.userId = data.user.id;
                    this.loginError = '';
                    this.loadInitialData(); // Load data after successful login
                    if (this.userRole === 'admin') {
                        this.currentView = 'allTickets';
                    } else {
                        this.currentView = 'myTickets';
                    }
                } else {
                    this.loginError = data.message || 'Login failed';
                    this.isAuthenticated = false;
                }
            } catch (error) {
                console.error('Login error:', error);
                this.loginError = 'Network error or server unavailable.';
            }
        },
        async logout() {
            try {
                await fetch('http://127.0.0.1:5000/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
                this.isAuthenticated = false;
                this.username = '';
                this.userRole = '';
                this.fullName = '';
                this.userId = null;
                this.currentView = 'login';
                this.myTickets = [];
                this.allTickets = [];
                this.departments = [];
                this.issueTypes = [];
                this.users = [];
                this.itUsers = [];
                this.selectedTicket = null;
                this.loginForm.password = ''; // Clear password field
            } catch (error) {
                console.error('Logout error:', error);
            }
        },

        async loadInitialData() {
            await Promise.all([
                this.fetchDepartments(),
                this.fetchIssueTypes()
            ]);
            if (this.userRole === 'admin') {
                await Promise.all([
                    this.loadAllTickets(),
                    this.loadUsers()
                ]);
            } else {
                await this.loadMyTickets();
            }
        },

        async fetchDepartments() {
            try {
                const response = await fetch('http://127.0.0.1:5000/api/departments', { credentials: 'include' });
                if (response.ok) {
                    this.departments = await response.json();
                } else {
                    console.error('Failed to fetch departments:', response.statusText);
                }
            } catch (error) {
                console.error('Error fetching departments:', error);
            }
        },
        async fetchIssueTypes() {
            try {
                const response = await fetch('http://127.0.0.1:5000/api/issue_types', { credentials: 'include' });
                if (response.ok) {
                    this.issueTypes = await response.json();
                } else {
                    console.error('Failed to fetch issue types:', response.statusText);
                }
            } catch (error) {
                console.error('Error fetching issue types:', error);
            }
        },

        async submitTicket() {
            this.ticketMessage = '';
            try {
                const response = await fetch('http://127.0.0.1:5000/api/tickets', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(this.newTicket),
                    credentials: 'include'
                });
                const data = await response.json();
                if (response.ok) {
                    this.ticketMessage = data.message;
                    this.ticketSuccess = true;
                    // Clear form after successful submission
                    this.newTicket = { department_id: '', issue_type_id: '', subject: '', description: '', urgency: 'Medium' };
                    await this.loadMyTickets(); // Refresh my tickets list
                    this.currentView = 'myTickets'; // Navigate to my tickets
                } else {
                    this.ticketMessage = data.message || 'Failed to create ticket.';
                    this.ticketSuccess = false;
                }
            } catch (error) {
                console.error('Error submitting ticket:', error);
                this.ticketMessage = 'Network error or server unavailable.';
                this.ticketSuccess = false;
            }
        },

        async loadMyTickets() {
            try {
                const response = await fetch('http://127.0.0.1:5000/api/tickets/my', { credentials: 'include' });
                if (response.ok) {
                    this.myTickets = await response.json();
                } else {
                    console.error('Failed to fetch my tickets:', response.statusText);
                    this.myTickets = [];
                }
            } catch (error) {
                console.error('Error fetching my tickets:', error);
                this.myTickets = [];
            }
        },

        async loadAllTickets() {
            if (this.userRole !== 'admin') return; // Ensure only admin can load all tickets

            let queryString = new URLSearchParams(this.filters).toString();
            try {
                const response = await fetch(`http://127.0.0.1:5000/api/tickets?${queryString}`, { credentials: 'include' });
                if (response.ok) {
                    this.allTickets = await response.json();
                } else {
                    console.error('Failed to fetch all tickets:', response.statusText);
                    this.allTickets = [];
                }
            } catch (error) {
                console.error('Error fetching all tickets:', error);
                this.allTickets = [];
            }
        },

        async viewTicketDetails(ticketId) {
            try {
                const response = await fetch(`http://127.0.0.1:5000/api/tickets/${ticketId}`, { credentials: 'include' });
                if (response.ok) {
                    this.selectedTicket = await response.json();
                    // Populate the update form with current ticket data
                    this.updateTicketForm.status = this.selectedTicket.status;
                    this.updateTicketForm.assigned_to_id = this.selectedTicket.assigned_to_name ? this.itUsers.find(u => u.full_name === this.selectedTicket.assigned_to_name)?.id : null;
                    this.updateTicketForm.resolution_notes = this.selectedTicket.resolution_notes;
                    this.updateTicketMessage = ''; // Clear previous messages
                    this.currentView = 'ticketDetails';
                } else {
                    console.error('Failed to fetch ticket details:', response.statusText);
                    this.selectedTicket = null;
                    alert('Could not load ticket details.');
                    // Go back to the appropriate list view
                    if (this.userRole === 'admin') {
                        this.currentView = 'allTickets';
                    } else {
                        this.currentView = 'myTickets';
                    }
                }
            } catch (error) {
                console.error('Error fetching ticket details:', error);
                this.selectedTicket = null;
                alert('Network error or server unavailable.');
                if (this.userRole === 'admin') {
                    this.currentView = 'allTickets';
                } else {
                    this.currentView = 'myTickets';
                }
            }
        },
        
        async updateTicketDetails() {
            this.updateTicketMessage = '';
            if (!this.selectedTicket) return;

            try {
                const response = await fetch(`http://127.0.0.1:5000/api/tickets/${this.selectedTicket.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(this.updateTicketForm),
                    credentials: 'include'
                });
                const data = await response.json();
                if (response.ok) {
                    this.updateTicketMessage = data.message;
                    this.updateTicketSuccess = true;
                    // Refresh the selected ticket data and possibly lists
                    await this.viewTicketDetails(this.selectedTicket.id); // Re-fetch details to update UI
                    if (this.userRole === 'admin') {
                        await this.loadAllTickets();
                    } else {
                        await this.loadMyTickets();
                    }
                } else {
                    this.updateTicketMessage = data.message || 'Failed to update ticket.';
                    this.updateTicketSuccess = false;
                }
            } catch (error) {
                console.error('Error updating ticket:', error);
                this.updateTicketMessage = 'Network error or server unavailable.';
                this.updateTicketSuccess = false;
            }
        },

        async addComment() {
            this.commentMessage = '';
            if (!this.selectedTicket || !this.newCommentText.trim()) {
                this.commentMessage = 'Comment cannot be empty.';
                this.commentSuccess = false;
                return;
            }

            try {
                const response = await fetch(`http://10.0.2.2:5000/api/tickets/${this.selectedTicket.id}/comments`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ comment: this.newCommentText }),
                    credentials: 'include'
                });
                const data = await response.json();
                if (response.ok) {
                    this.commentMessage = data.message;
                    this.commentSuccess = true;
                    this.newCommentText = ''; // Clear comment box
                    await this.viewTicketDetails(this.selectedTicket.id); // Re-fetch details to show new comment
                } else {
                    this.commentMessage = data.message || 'Failed to add comment.';
                    this.commentSuccess = false;
                }
            } catch (error) {
                console.error('Error adding comment:', error);
                this.commentMessage = 'Network error or server unavailable.';
                this.commentSuccess = false;
            }
        },

        async loadUsers() {
            if (this.userRole !== 'admin') return;
            try {
                const response = await fetch('http://127.0.0.1:5000/api/users', { credentials: 'include' });
                if (response.ok) {
                    this.users = await response.json();
                    this.itUsers = this.users.filter(user => user.role === 'admin'); // For assigning tickets
                } else {
                    console.error('Failed to fetch users:', response.statusText);
                    this.users = [];
                }
            } catch (error) {
                console.error('Error fetching users:', error);
                this.users = [];
            }
        },

        async updateUser(userId, updatedFields) {
            this.$set(this.userUpdateMessage, userId, ''); // Clear previous message
            this.$set(this.userUpdateSuccess, userId, false);

            try {
                const response = await fetch(`http://127.0.0.1:5000/api/users/${userId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updatedFields),
                    credentials: 'include'
                });
                const data = await response.json();
                if (response.ok) {
                    this.$set(this.userUpdateMessage, userId, data.message);
                    this.$set(this.userUpdateSuccess, userId, true);
                    await this.loadUsers(); // Refresh the users list to reflect changes
                } else {
                    this.$set(this.userUpdateMessage, userId, data.message || 'Failed to update user.');
                    this.$set(this.userUpdateSuccess, userId, false);
                }
            } catch (error) {
                console.error('Error updating user:', error);
                this.$set(this.userUpdateMessage, userId, 'Network error or server unavailable.');
                this.$set(this.userUpdateSuccess, userId, false);
            }
        },

        // Navigation Methods
        viewTickets() {
            this.currentView = 'myTickets';
            this.loadMyTickets();
        },
        viewAllTickets() {
            if (this.userRole === 'admin') {
                this.currentView = 'allTickets';
                this.loadAllTickets();
            }
        },
        createTicket() {
            this.currentView = 'createTicket';
            this.ticketMessage = ''; // Clear previous message
            this.ticketSuccess = false;
            this.newTicket = { department_id: '', issue_type_id: '', subject: '', description: '', urgency: 'Medium' };
        },
        viewUsers() {
            if (this.userRole === 'admin') {
                this.currentView = 'users';
                this.loadUsers();
            }
        },
        goBackToList() {
            if (this.userRole === 'admin') {
                this.currentView = 'allTickets';
                this.loadAllTickets(); // Refresh the list after returning
            } else {
                this.currentView = 'myTickets';
                this.loadMyTickets(); // Refresh the list after returning
            }
            this.selectedTicket = null; // Clear selected ticket
        }
    },
    created() {
        this.fetchAuthStatus();
    }
});