<script>
export default {
  name: 'RouteView',
  props: {
    keepAlive: {
      type: Boolean,
      default: true
    }
  },
  data () {
    return {}
  },
  render () {
    const { $route: { meta }, $store: { getters } } = this
    const inKeep = (
      <keep-alive>
        <router-view />
      </keep-alive>
    )
    const notKeep = (
      <router-view />
    )
    // Added multiTab check here: when multiTab is enabled,
    // all components should be cached, otherwise switching pages will reset them to initial state
    // If caching is not needed, change to: return meta.keepAlive ? inKeep : notKeep
    if (!getters.multiTab && !meta.keepAlive) {
      return notKeep
    }
    return this.keepAlive || getters.multiTab || meta.keepAlive ? inKeep : notKeep
  }
}
</script>
