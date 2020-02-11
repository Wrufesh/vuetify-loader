<template>
  <v-app>
    <v-container>
      <v-card v-ripple>
        <div style="text-align: center">
          <v-img src="@/vuetify.png" style="display: inline-flex"></v-img>
        </div>
        <v-card-text>
          <v-text-field></v-text-field>
        </v-card-text>
      </v-card>
    </v-container>
  </v-app>
</template>

<script>
  export default {
    data(){
      return {
        myIcon: this.$getIcon('mdiHead'),
        yourIcon: this.$getIcon('mdiHead')
      }
    },
    mounted(){
      if(1===1){
        this.myIcon = this.$getIcon('mdiHead')
      }
    },
    methods: {
      onClick(){
        this.yourIcon = this.$getIcon('mdiHead')
      }
    }
  }
</script>
